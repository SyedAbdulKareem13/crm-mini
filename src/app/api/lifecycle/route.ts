import { NextResponse } from "next/server";
import { z } from "zod";
import type { LeadStatus, OpportunityStage, RFQStatus, QuotationStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit, type AuditInput } from "@/lib/audit";
import { REOPEN_ROLES } from "@/lib/lifecycle-status";

/**
 * Lifecycle governance — controlled CANCEL / REOPEN for the four presales
 * entities. Cancellation is a first-class, reversible terminal state (distinct
 * from LOST): it stamps who/when/why, keeps the record read-only everywhere the
 * mutation routes guard it, and can be reopened by a manager. All transitions
 * are audited; the prior status is preserved for a faithful restore.
 */

type Entity = "LEAD" | "OPPORTUNITY" | "RFQ" | "QUOTATION";

const schema = z
  .object({
    action: z.enum(["cancel", "reopen"]),
    entityType: z.enum(["LEAD", "OPPORTUNITY", "RFQ", "QUOTATION"]),
    id: z.string().min(1),
    reason: z.string().optional(),
  })
  .refine((d) => d.action !== "cancel" || (!!d.reason && d.reason.trim().length >= 3), {
    message: "A reason of at least 3 characters is required to cancel.",
    path: ["reason"],
  });

const APP_PATH: Record<Entity, string> = {
  LEAD: "leads",
  OPPORTUNITY: "opportunities",
  RFQ: "rfqs",
  QUOTATION: "quotations",
};

/** Statuses a record may legitimately be restored to on reopen (excludes CANCELLED). */
const RESTORABLE: Record<Entity, string[]> = {
  LEAD: ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"],
  OPPORTUNITY: [
    "QUALIFICATION", "DISCOVERY", "REQUIREMENT_ANALYSIS", "PROPOSAL_SUBMITTED",
    "RFQ_RECEIVED", "QUOTATION_SENT", "NEGOTIATION", "MANAGEMENT_APPROVAL",
    "VERBAL_CONFIRMATION", "WON", "LOST",
  ],
  RFQ: ["DRAFT", "RECEIVED", "IN_PROGRESS", "QUOTED", "CLOSED"],
  QUOTATION: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"],
};
const FALLBACK: Record<Entity, string> = {
  LEAD: "NEW",
  OPPORTUNITY: "QUALIFICATION",
  RFQ: "DRAFT",
  QUOTATION: "DRAFT",
};

type Ctx = { orgId: string; actorId: string; actorName: string | null; role: string };

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const conflict = (m: string) => NextResponse.json({ error: m }, { status: 409 });

async function audit(
  ctx: Ctx,
  entity: Entity,
  id: string,
  label: string,
  action: "CANCELLED" | "REOPENED",
  summary: string
): Promise<void> {
  await recordAudit({
    organizationId: ctx.orgId,
    entityType: entity,
    entityId: id,
    entityLabel: label,
    // "CANCELLED"/"REOPENED" are not (yet) in AuditInput's action union in
    // src/lib/audit.ts, which is out of this agent's edit scope. The AuditLog
    // column is a plain String, so this is safe at runtime; cast keeps TS happy.
    action: action as AuditInput["action"],
    summary,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
  });
}

/** Notify the record owner (Lead/Opportunity only carry an ownerId). */
async function notifyOwner(
  ctx: Ctx,
  entity: Entity,
  id: string,
  number: string,
  ownerId: string | null
): Promise<void> {
  if (!ownerId || ownerId === ctx.actorId) return;
  await prisma.notification
    .create({
      data: {
        organizationId: ctx.orgId,
        userId: ownerId,
        type: "SYSTEM",
        title: `${number} was cancelled`,
        url: `/app/${APP_PATH[entity]}/${id}`,
      },
    })
    .catch(() => null);
}

async function doCancel(entity: Entity, id: string, reason: string, ctx: Ctx): Promise<NextResponse> {
  const stamp = {
    cancelledAt: new Date(),
    cancelledById: ctx.actorId,
    cancelledByName: ctx.actorName,
    cancelReason: reason,
  };

  if (entity === "LEAD") {
    const rec = await prisma.lead.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.status === "CANCELLED") return conflict("This lead is already cancelled.");
    if (rec.status === "CONVERTED")
      return conflict("Converted leads live on as their opportunity — cancel the opportunity instead.");
    await prisma.lead.update({
      where: { id },
      data: { status: "CANCELLED", statusBeforeCancel: rec.status, ...stamp },
    });
    await audit(ctx, entity, id, rec.leadNumber, "CANCELLED", `Cancelled — ${reason}`);
    await notifyOwner(ctx, entity, id, rec.leadNumber, rec.ownerId);
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (entity === "OPPORTUNITY") {
    const rec = await prisma.opportunity.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.stage === "CANCELLED") return conflict("This opportunity is already cancelled.");
    if (rec.stage === "WON") return conflict("Won opportunities can't be cancelled.");
    const project = await prisma.project.findFirst({
      where: { organizationId: ctx.orgId, opportunityId: id, NOT: { status: "CANCELLED" } },
      select: { projectNumber: true },
    });
    if (project)
      return conflict(`A delivery project exists — cancel or complete ${project.projectNumber} first.`);
    await prisma.opportunity.update({
      where: { id },
      data: { stage: "CANCELLED", statusBeforeCancel: rec.stage, ...stamp },
    });
    await audit(ctx, entity, id, rec.oppNumber, "CANCELLED", `Cancelled — ${reason}`);
    await notifyOwner(ctx, entity, id, rec.oppNumber, rec.ownerId);
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (entity === "RFQ") {
    const rec = await prisma.rFQ.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.status === "CANCELLED") return conflict("This RFQ is already cancelled.");
    await prisma.rFQ.update({
      where: { id },
      data: { status: "CANCELLED", statusBeforeCancel: rec.status, ...stamp },
    });
    await audit(ctx, entity, id, rec.rfqNumber, "CANCELLED", `Cancelled — ${reason}`);
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  // QUOTATION
  const rec = await prisma.quotation.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: { approvalRequest: true },
  });
  if (!rec) return notFound();
  if (rec.status === "CANCELLED") return conflict("This quotation is already cancelled.");
  if (rec.status === "ACCEPTED")
    return conflict("Accepted quotations are contractual — issue a revision instead.");
  await prisma.quotation.update({
    where: { id },
    data: { status: "CANCELLED", statusBeforeCancel: rec.status, ...stamp },
  });
  // Pull any in-flight approval out of the queue. ApprovalStatus has no
  // CANCELLED member; WITHDRAWN is its exact semantic (the requester pulled it)
  // and is preferable to REJECTED, which would wrongly imply an approver acted.
  if (rec.approvalRequest && rec.approvalRequest.status === "PENDING") {
    await prisma.approvalRequest.update({
      where: { id: rec.approvalRequest.id },
      data: { status: "WITHDRAWN", notes: `Withdrawn — quotation cancelled: ${reason}` },
    });
  }
  await audit(ctx, entity, id, rec.quotationNumber, "CANCELLED", `Cancelled — ${reason}`);
  return NextResponse.json({ ok: true, status: "CANCELLED" });
}

async function doReopen(entity: Entity, id: string, ctx: Ctx): Promise<NextResponse> {
  if (!(REOPEN_ROLES as readonly string[]).includes(ctx.role)) {
    return NextResponse.json(
      { error: "Only Sales Managers, Business Heads or Admins can reopen cancelled records." },
      { status: 403 }
    );
  }

  const restoreFrom = (prev: string | null) =>
    prev && RESTORABLE[entity].includes(prev) ? prev : FALLBACK[entity];
  const reopenSummary = (prevReason: string | null) =>
    `Reopened (was cancelled${prevReason ? ` — ${prevReason}` : ""})`;
  const clear = { cancelledAt: null, cancelledById: null, cancelledByName: null, cancelReason: null, statusBeforeCancel: null };

  if (entity === "LEAD") {
    const rec = await prisma.lead.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.status !== "CANCELLED") return conflict("This lead isn't cancelled.");
    const status = restoreFrom(rec.statusBeforeCancel);
    await prisma.lead.update({ where: { id }, data: { status: status as LeadStatus, ...clear } });
    await audit(ctx, entity, id, rec.leadNumber, "REOPENED", reopenSummary(rec.cancelReason));
    return NextResponse.json({ ok: true, status });
  }

  if (entity === "OPPORTUNITY") {
    const rec = await prisma.opportunity.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.stage !== "CANCELLED") return conflict("This opportunity isn't cancelled.");
    const status = restoreFrom(rec.statusBeforeCancel);
    await prisma.opportunity.update({
      where: { id },
      data: { stage: status as OpportunityStage, stageEnteredAt: new Date(), ...clear },
    });
    await audit(ctx, entity, id, rec.oppNumber, "REOPENED", reopenSummary(rec.cancelReason));
    return NextResponse.json({ ok: true, status });
  }

  if (entity === "RFQ") {
    const rec = await prisma.rFQ.findFirst({ where: { id, organizationId: ctx.orgId } });
    if (!rec) return notFound();
    if (rec.status !== "CANCELLED") return conflict("This RFQ isn't cancelled.");
    const status = restoreFrom(rec.statusBeforeCancel);
    await prisma.rFQ.update({ where: { id }, data: { status: status as RFQStatus, ...clear } });
    await audit(ctx, entity, id, rec.rfqNumber, "REOPENED", reopenSummary(rec.cancelReason));
    return NextResponse.json({ ok: true, status });
  }

  // QUOTATION
  const rec = await prisma.quotation.findFirst({ where: { id, organizationId: ctx.orgId } });
  if (!rec) return notFound();
  if (rec.status !== "CANCELLED") return conflict("This quotation isn't cancelled.");
  const status = restoreFrom(rec.statusBeforeCancel);
  await prisma.quotation.update({ where: { id }, data: { status: status as QuotationStatus, ...clear } });
  await audit(ctx, entity, id, rec.quotationNumber, "REOPENED", reopenSummary(rec.cancelReason));
  return NextResponse.json({ ok: true, status });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const { action, entityType, id, reason } = parsed.data;
  const ctx: Ctx = {
    orgId: session.user.organizationId,
    actorId: session.user.id,
    actorName: session.user.name ?? null,
    role: session.user.role ?? "",
  };

  return action === "cancel"
    ? doCancel(entityType, id, reason!.trim(), ctx)
    : doReopen(entityType, id, ctx);
}
