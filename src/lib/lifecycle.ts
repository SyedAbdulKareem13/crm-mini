/**
 * Lifecycle engine (SERVER) — resolves the full sales thread for any record:
 *
 *   Lead → Opportunity → RFQ → Quotation → Approval → Won → Project
 *
 * One resolver feeds the flow strip, breadcrumbs, prev/next navigation, the
 * stage timeline and the merged activity history, so they can never disagree.
 *
 * Threads fan out (an opportunity can hold several RFQs/quotations): the
 * resolver focuses the station on the entry record itself when the entry IS
 * that type, otherwise on the most meaningful sibling (accepted/approved
 * quotation first, else latest), and reports the rest as a sibling note.
 */

import { prisma } from "@/lib/prisma";
import {
  FLOW_STATIONS,
  statusTone,
  type LifecycleEntity,
  type LifecycleThreadDTO,
  type StatusTone,
  type ThreadStation,
} from "@/lib/lifecycle-status";

export type ThreadEntry = { type: LifecycleEntity; id: string };

const QUOTE_PRIORITY = ["ACCEPTED", "APPROVED", "SENT", "PENDING_APPROVAL"];

function pickQuotation<T extends { status: string; createdAt: Date; id: string }>(
  list: T[],
  entryId?: string
): T | null {
  if (!list.length) return null;
  if (entryId) {
    const own = list.find((q) => q.id === entryId);
    if (own) return own;
  }
  for (const s of QUOTE_PRIORITY) {
    const hit = list.find((q) => q.status === s);
    if (hit) return hit;
  }
  return [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export async function getLifecycleThread(
  organizationId: string,
  entry: ThreadEntry
): Promise<LifecycleThreadDTO | null> {
  // 1. Find the opportunity anchor (the spine of the thread) from any entry.
  let opportunityId: string | null = null;
  let leadIdDirect: string | null = null;

  if (entry.type === "LEAD") {
    const lead = await prisma.lead.findFirst({
      where: { id: entry.id, organizationId },
      select: { id: true, convertedOpportunityId: true },
    });
    if (!lead) return null;
    leadIdDirect = lead.id;
    opportunityId = lead.convertedOpportunityId;
  } else if (entry.type === "OPPORTUNITY") {
    opportunityId = entry.id;
  } else if (entry.type === "RFQ") {
    const rfq = await prisma.rFQ.findFirst({
      where: { id: entry.id, organizationId },
      select: { opportunityId: true },
    });
    if (!rfq) return null;
    opportunityId = rfq.opportunityId;
  } else if (entry.type === "QUOTATION") {
    const q = await prisma.quotation.findFirst({
      where: { id: entry.id, organizationId },
      select: { opportunityId: true, rfq: { select: { opportunityId: true } } },
    });
    if (!q) return null;
    opportunityId = q.opportunityId ?? q.rfq?.opportunityId ?? null;
  } else if (entry.type === "PROJECT") {
    const p = await prisma.project.findFirst({
      where: { id: entry.id, organizationId },
      select: { opportunityId: true },
    });
    if (!p) return null;
    opportunityId = p.opportunityId;
  }

  // 2. Load the whole thread around the anchor in one pass.
  const opp = opportunityId
    ? await prisma.opportunity.findFirst({
        where: { id: opportunityId, organizationId },
        select: {
          id: true,
          oppNumber: true,
          name: true,
          stage: true,
          createdAt: true,
          stageEnteredAt: true,
          fromLead: { select: { id: true, leadNumber: true, name: true, status: true, createdAt: true } },
          rfqs: {
            select: { id: true, rfqNumber: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              status: true,
              createdAt: true,
              approvalRequest: { select: { id: true, status: true, updatedAt: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          project: { select: { id: true, projectNumber: true, name: true, status: true, createdAt: true } },
        },
      })
    : null;

  // A lead that hasn't converted yet still gets a thread (later stations pending).
  const lead =
    opp?.fromLead ??
    (leadIdDirect
      ? await prisma.lead.findFirst({
          where: { id: leadIdDirect, organizationId },
          select: { id: true, leadNumber: true, name: true, status: true, createdAt: true },
        })
      : null);
  if (!opp && !lead) return null;

  const rfq = opp
    ? entry.type === "RFQ"
      ? opp.rfqs.find((r) => r.id === entry.id) ?? opp.rfqs[0] ?? null
      : opp.rfqs[0] ?? null
    : entry.type === "RFQ"
      ? await prisma.rFQ.findFirst({
          where: { id: entry.id, organizationId },
          select: { id: true, rfqNumber: true, status: true, createdAt: true },
        })
      : null;

  const quotation = opp
    ? pickQuotation(opp.quotations, entry.type === "QUOTATION" ? entry.id : undefined)
    : entry.type === "QUOTATION"
      ? await prisma.quotation.findFirst({
          where: { id: entry.id, organizationId },
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            createdAt: true,
            approvalRequest: { select: { id: true, status: true, updatedAt: true } },
          },
        })
      : null;

  const approval = quotation?.approvalRequest ?? null;
  const project = opp?.project ?? null;

  // 3. Assemble the seven stations.
  const tone = (e: LifecycleEntity, s: string): StatusTone => statusTone(e, s);
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

  const stations: ThreadStation[] = FLOW_STATIONS.map(({ key, label }) => {
    const base: ThreadStation = {
      key,
      label,
      tone: "pending",
      isCurrent: false,
      record: null,
      siblingNote: null,
    };
    if (key === "LEAD" && lead) {
      base.tone = tone("LEAD", lead.status);
      base.record = {
        type: "LEAD",
        id: lead.id,
        number: lead.leadNumber,
        title: lead.name,
        status: lead.status,
        href: `/app/leads/${lead.id}`,
        date: iso(lead.createdAt),
      };
    } else if (key === "OPPORTUNITY" && opp) {
      base.tone = tone("OPPORTUNITY", opp.stage);
      base.record = {
        type: "OPPORTUNITY",
        id: opp.id,
        number: opp.oppNumber,
        title: opp.name,
        status: opp.stage,
        href: `/app/opportunities/${opp.id}`,
        date: iso(opp.createdAt),
      };
    } else if (key === "RFQ" && rfq) {
      base.tone = tone("RFQ", rfq.status);
      base.record = {
        type: "RFQ",
        id: rfq.id,
        number: rfq.rfqNumber,
        title: rfq.rfqNumber,
        status: rfq.status,
        href: `/app/rfqs/${rfq.id}`,
        date: iso(rfq.createdAt),
      };
      const extra = (opp?.rfqs.length ?? 1) - 1;
      if (extra > 0) base.siblingNote = `+${extra} more RFQ${extra === 1 ? "" : "s"}`;
    } else if (key === "QUOTATION" && quotation) {
      base.tone = tone("QUOTATION", quotation.status);
      base.record = {
        type: "QUOTATION",
        id: quotation.id,
        number: quotation.quotationNumber,
        title: quotation.quotationNumber,
        status: quotation.status,
        href: `/app/quotations/${quotation.id}`,
        date: iso(quotation.createdAt),
      };
      const extra = (opp?.quotations.length ?? 1) - 1;
      if (extra > 0) base.siblingNote = `+${extra} more quotation${extra === 1 ? "" : "s"}`;
    } else if (key === "APPROVAL") {
      if (approval) {
        base.tone = tone("APPROVAL", approval.status);
        base.record = {
          type: "APPROVAL",
          id: approval.id,
          number: "Approval",
          title: `Approval · ${approval.status.toLowerCase()}`,
          status: approval.status,
          href: "/app/approvals",
          date: iso(approval.updatedAt),
        };
      } else if (quotation && ["APPROVED", "SENT", "ACCEPTED"].includes(quotation.status)) {
        // Approved without a formal chain (e.g. auto-approved) — reads completed.
        base.tone = "completed";
      }
    } else if (key === "AWARD" && opp) {
      if (opp.stage === "WON") {
        base.tone = "completed";
        base.record = {
          type: "OPPORTUNITY",
          id: opp.id,
          number: "Won",
          title: "Project awarded",
          status: "WON",
          href: `/app/opportunities/${opp.id}`,
          date: iso(opp.stageEnteredAt),
        };
      } else if (opp.stage === "LOST" || opp.stage === "CANCELLED") {
        base.tone = "cancelled";
      }
    } else if (key === "PROJECT" && project) {
      base.tone = tone("PROJECT", project.status);
      base.record = {
        type: "PROJECT",
        id: project.id,
        number: project.projectNumber,
        title: project.name,
        status: project.status,
        href: `/app/projects/${project.id}`,
        date: iso(project.createdAt),
      };
    }
    return base;
  });

  // Blue-highlight the entry's station (AWARD belongs to the opportunity).
  for (const st of stations) {
    if (st.record?.type === entry.type && st.record.id === entry.id && st.key !== "AWARD") {
      st.isCurrent = true;
    }
  }

  // 4. Breadcrumbs: Home > <module> > every ancestor number > current number.
  const MODULE: Record<string, { label: string; href: string }> = {
    LEAD: { label: "Leads", href: "/app/leads" },
    OPPORTUNITY: { label: "Opportunities", href: "/app/opportunities" },
    RFQ: { label: "RFQs", href: "/app/rfqs" },
    QUOTATION: { label: "Quotations", href: "/app/quotations" },
    PROJECT: { label: "Projects", href: "/app/projects" },
  };
  const order: LifecycleEntity[] = ["LEAD", "OPPORTUNITY", "RFQ", "QUOTATION", "PROJECT"];
  const entryIdx = order.indexOf(entry.type);
  const crumbs: LifecycleThreadDTO["crumbs"] = [{ label: "Home", href: "/app" }];
  const mod = MODULE[entry.type];
  if (mod) crumbs.push({ label: mod.label, href: mod.href });
  for (const t of order.slice(0, entryIdx + 1)) {
    const st = stations.find((s) => s.record?.type === t && (t !== entry.type || s.record.id === entry.id));
    if (st?.record) {
      crumbs.push({
        label: st.record.number,
        href: st.record.id === entry.id ? null : st.record.href,
      });
    }
  }

  const currentStation = stations.find((s) => s.isCurrent);
  return {
    stations,
    crumbs,
    cancelled: currentStation?.record?.status === "CANCELLED",
  };
}

/* ------------------- milestones + merged history (audit) ---------------- */

export type ThreadMilestone = {
  label: string; // Created / Submitted for approval / Approved / Cancelled …
  at: string; // ISO
  by: string | null;
  entityNumber: string;
};

export type ThreadHistoryEntry = {
  at: string;
  by: string | null;
  entityType: string;
  entityNumber: string;
  action: string;
  summary: string;
};

const MILESTONE_ACTIONS = new Set([
  "CREATED",
  "STATUS_CHANGED",
  "STAGE_CHANGED",
  "APPROVED",
  "REJECTED",
  "SUBMITTED",
  "CANCELLED",
  "REOPENED",
  "DELETED",
]);

/** Audit rows across every record in the thread, newest first (history) and
 *  the milestone subset oldest first (timeline). */
export async function getThreadAudit(
  organizationId: string,
  thread: LifecycleThreadDTO
): Promise<{ milestones: ThreadMilestone[]; history: ThreadHistoryEntry[] }> {
  const ids = thread.stations
    .map((s) => s.record)
    .filter((r): r is NonNullable<ThreadStation["record"]> => !!r && r.type !== "APPROVAL")
    .map((r) => r.id);
  if (!ids.length) return { milestones: [], history: [] };

  const rows = await prisma.auditLog.findMany({
    where: { organizationId, entityId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      createdAt: true,
      actorName: true,
      entityType: true,
      entityId: true,
      action: true,
      summary: true,
    },
  });

  const numberById = new Map(
    thread.stations.filter((s) => s.record).map((s) => [s.record!.id, s.record!.number])
  );

  const history: ThreadHistoryEntry[] = rows.map((r) => ({
    at: r.createdAt.toISOString(),
    by: r.actorName ?? null,
    entityType: r.entityType,
    entityNumber: numberById.get(r.entityId) ?? r.entityType,
    action: r.action,
    summary: r.summary ?? r.action,
  }));

  const milestones: ThreadMilestone[] = [...rows]
    .reverse()
    .filter((r) => MILESTONE_ACTIONS.has(r.action))
    .map((r) => ({
      label: r.summary ?? r.action,
      at: r.createdAt.toISOString(),
      by: r.actorName ?? null,
      entityNumber: numberById.get(r.entityId) ?? r.entityType,
    }));

  return { milestones, history };
}
