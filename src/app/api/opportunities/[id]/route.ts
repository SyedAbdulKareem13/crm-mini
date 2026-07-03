import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit, diffFields } from "@/lib/audit";
import { mergeCustomData } from "@/lib/field-config";
import { OPP_STAGES } from "@/lib/constants";

const updateSchema = z.object({
  name: z.string().optional(),
  customerId: z.string().optional(),
  expectedRevenue: z.coerce.number().nonnegative().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  stage: z
    .enum([
      "QUALIFICATION", "DISCOVERY", "REQUIREMENT_ANALYSIS", "PROPOSAL_SUBMITTED",
      "RFQ_RECEIVED", "QUOTATION_SENT", "NEGOTIATION", "MANAGEMENT_APPROVAL",
      "VERBAL_CONFIRMATION", "WON", "LOST",
    ])
    .optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const before = await prisma.opportunity.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stageChanged = parsed.data.stage !== undefined && parsed.data.stage !== before.stage;
  const { data: customData, ...core } = parsed.data;
  const mergedData = mergeCustomData(before.data, customData);
  const updated = await prisma.opportunity.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...core,
      ...(mergedData !== undefined ? { data: mergedData as Prisma.InputJsonValue } : {}),
      expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : undefined,
      ...(stageChanged ? { stageEnteredAt: new Date() } : {}),
    },
  });

  if (stageChanged) {
    await prisma.notification.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        type: "STAGE_CHANGE",
        title: `${updated.oppNumber} moved to ${updated.stage}`,
        url: `/app/opportunities/${updated.id}`,
      },
    }).catch(() => null);
  }

  const lbl = (v?: string | null) => OPP_STAGES.find((s) => s.value === v)?.label ?? v ?? "—";
  const changes = diffFields(before as Record<string, unknown>, parsed.data as Record<string, unknown>, [
    "name", "customerId", "expectedRevenue", "probability", "expectedCloseDate", "notes", "lostReason", "stage",
  ]);
  await recordAudit({
    organizationId: session.user.organizationId,
    entityType: "OPPORTUNITY",
    entityId: updated.id,
    entityLabel: updated.oppNumber,
    action: stageChanged ? "STAGE_CHANGED" : "UPDATED",
    summary: stageChanged
      ? `Stage moved: ${lbl(before.stage)} → ${lbl(parsed.data.stage)}`
      : `Opportunity updated · ${changes.length} field${changes.length === 1 ? "" : "s"}`,
    changes,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ opportunity: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.opportunity.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { oppNumber: true, name: true },
  });
  await prisma.opportunity.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  if (existing) {
    await recordAudit({
      organizationId: session.user.organizationId,
      entityType: "OPPORTUNITY",
      entityId: id,
      entityLabel: existing.oppNumber,
      action: "DELETED",
      summary: `Opportunity “${existing.name}” deleted`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
  }
  return NextResponse.json({ ok: true });
}
