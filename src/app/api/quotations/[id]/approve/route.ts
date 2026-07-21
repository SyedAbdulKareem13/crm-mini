import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APPROVAL_CHAIN_DEFAULT } from "@/lib/constants";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

const schema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT"]),
  comments: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  // Submitting a quote for approval is an UPDATE; acting on the approval
  // (APPROVE / REJECT) requires the APPROVE permission on Quotations.
  const denied = await requirePermission(
    session,
    "QUOTATIONS",
    parsed.data.action === "SUBMIT" ? "update" : "approve"
  );
  if (denied) return denied;

  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { approvalRequest: { include: { steps: { orderBy: { stepNumber: "asc" } } } } },
  });
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Lifecycle governance: a cancelled quotation is read-only — no submit/approve/reject.
  if (quotation.status === "CANCELLED") {
    const who = quotation.cancelledByName ?? "a user";
    const when = quotation.cancelledAt
      ? new Date(quotation.cancelledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "an earlier date";
    return NextResponse.json(
      { error: `This quotation was cancelled by ${who} on ${when} and is read-only — reopen it to make changes.`, code: "cancelled" },
      { status: 409 }
    );
  }

  if (parsed.data.action === "SUBMIT") {
    if (quotation.approvalRequest) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
    const request = await prisma.approvalRequest.create({
      data: {
        quotationId: quotation.id,
        requestedById: session.user.id,
        status: "PENDING",
        currentStep: 1,
        steps: {
          create: APPROVAL_CHAIN_DEFAULT.map((s) => ({
            stepNumber: s.stepNumber,
            label: s.label,
            roleRequired: s.roleRequired,
            status: "PENDING",
          })),
        },
      },
      include: { steps: true },
    });
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "PENDING_APPROVAL" },
    });
    await recordAudit({
      organizationId: session.user.organizationId,
      entityType: "QUOTATION",
      entityId: quotation.id,
      entityLabel: quotation.quotationNumber,
      action: "SUBMITTED",
      summary: "Submitted for approval",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ request });
  }

  if (!quotation.approvalRequest) {
    return NextResponse.json({ error: "No active approval" }, { status: 409 });
  }
  const currentStep = quotation.approvalRequest.steps.find(
    (s) => s.stepNumber === quotation.approvalRequest!.currentStep
  );
  if (!currentStep) return NextResponse.json({ error: "Invalid step" }, { status: 400 });

  if (parsed.data.action === "REJECT") {
    await prisma.$transaction([
      prisma.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: "REJECTED",
          approverId: session.user.id,
          comments: parsed.data.comments,
          actedAt: new Date(),
        },
      }),
      prisma.approvalRequest.update({
        where: { id: quotation.approvalRequest.id },
        data: { status: "REJECTED" },
      }),
      prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: "REJECTED" },
      }),
    ]);
    await recordAudit({
      organizationId: session.user.organizationId,
      entityType: "QUOTATION",
      entityId: quotation.id,
      entityLabel: quotation.quotationNumber,
      action: "REJECTED",
      summary: `Rejected at “${currentStep.label}”${parsed.data.comments ? ` — ${parsed.data.comments}` : ""}`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ ok: true });
  }

  // APPROVE — advance
  const nextStep = quotation.approvalRequest.steps.find(
    (s) => s.stepNumber === currentStep.stepNumber + 1
  );
  await prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: {
      status: "APPROVED",
      approverId: session.user.id,
      comments: parsed.data.comments,
      actedAt: new Date(),
    },
  });

  if (nextStep) {
    await prisma.approvalRequest.update({
      where: { id: quotation.approvalRequest.id },
      data: { currentStep: nextStep.stepNumber },
    });
  } else {
    await prisma.$transaction([
      prisma.approvalRequest.update({
        where: { id: quotation.approvalRequest.id },
        data: { status: "APPROVED" },
      }),
      prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: "APPROVED" },
      }),
    ]);
  }
  await recordAudit({
    organizationId: session.user.organizationId,
    entityType: "QUOTATION",
    entityId: quotation.id,
    entityLabel: quotation.quotationNumber,
    action: "APPROVED",
    summary: nextStep
      ? `Approved “${currentStep.label}” — awaiting ${nextStep.label}`
      : "Final approval granted — quotation approved",
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ ok: true });
}
