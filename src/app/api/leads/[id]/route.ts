import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit, diffFields } from "@/lib/audit";
import { mergeCustomData } from "@/lib/field-config";
import { requirePermission } from "@/lib/permissions";

/** Human-readable read-only notice for a cancelled record (lifecycle governance). */
function cancelledMessage(
  entity: string,
  rec: { cancelledByName: string | null; cancelledAt: Date | null }
): string {
  const who = rec.cancelledByName ?? "a user";
  const when = rec.cancelledAt
    ? new Date(rec.cancelledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "an earlier date";
  return `This ${entity} was cancelled by ${who} on ${when} and is read-only — reopen it to make changes.`;
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  company: z.string().min(1).optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  mobile: z.string().optional(),
  source: z.enum(["WEBSITE", "REFERRAL", "COLD_CALL", "EMAIL_CAMPAIGN", "EVENT", "PARTNER", "SOCIAL", "OTHER"]).optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"]).optional(),
  expectedRevenue: z.coerce.number().optional(),
  data: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requirePermission(session, "LEADS", "update");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const before = await prisma.lead.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Lifecycle governance: a cancelled record is read-only until reopened.
  if (before.status === "CANCELLED") {
    return NextResponse.json({ error: cancelledMessage("lead", before), code: "cancelled" }, { status: 409 });
  }

  const { data: customData, ...core } = parsed.data;
  const mergedData = mergeCustomData(before.data, customData);
  const lead = await prisma.lead.update({
    where: { id, organizationId: session.user.organizationId },
    data: {
      ...core,
      ...(mergedData !== undefined ? { data: mergedData as Prisma.InputJsonValue } : {}),
    },
  });

  const changes = diffFields(before as Record<string, unknown>, parsed.data as Record<string, unknown>, [
    "name", "company", "contactPerson", "email", "mobile", "source", "industry", "notes", "status", "expectedRevenue",
  ]);
  const statusChanged = parsed.data.status && parsed.data.status !== before.status;
  await recordAudit({
    organizationId: session.user.organizationId,
    entityType: "LEAD",
    entityId: lead.id,
    entityLabel: lead.leadNumber,
    action: statusChanged ? "STATUS_CHANGED" : "UPDATED",
    summary: statusChanged
      ? `Status changed: ${before.status} → ${parsed.data.status}`
      : `Lead updated · ${changes.length} field${changes.length === 1 ? "" : "s"}`,
    changes,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = await requirePermission(session, "LEADS", "delete");
  if (denied) return denied;
  const existing = await prisma.lead.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { leadNumber: true, name: true, status: true, cancelledByName: true, cancelledAt: true },
  });
  // Deleting cancelled history is an admin-only call; other roles are guarded.
  if (existing && existing.status === "CANCELLED" && !["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: cancelledMessage("lead", existing), code: "cancelled" }, { status: 409 });
  }
  await prisma.lead.delete({
    where: { id, organizationId: session.user.organizationId },
  });
  if (existing) {
    await recordAudit({
      organizationId: session.user.organizationId,
      entityType: "LEAD",
      entityId: id,
      entityLabel: existing.leadNumber,
      action: "DELETED",
      summary: `Lead “${existing.name}” deleted`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
  }
  return NextResponse.json({ ok: true });
}
