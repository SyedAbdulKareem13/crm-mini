/**
 * Lifecycle status semantics — CLIENT-SAFE (no prisma import).
 *
 * One source of truth for the six status tones used across the whole app
 * (flow strip, badges, lists, timeline):
 *   completed        → green    (done / won / approved)
 *   current          → blue     (the record you're looking at)
 *   in_progress      → yellow   (actively being worked)
 *   pending_approval → orange   (waiting on an approver)
 *   cancelled        → red      (cancelled / lost / rejected — terminal)
 *   draft            → grey     (not started / draft / pending)
 */

export type LifecycleEntity = "LEAD" | "OPPORTUNITY" | "RFQ" | "QUOTATION" | "APPROVAL" | "PROJECT";

export type StatusTone =
  | "completed"
  | "current"
  | "in_progress"
  | "pending_approval"
  | "cancelled"
  | "draft";

/** Tailwind classes per tone — badge (solid-ish) and dot variants. */
export const TONE_STYLES: Record<StatusTone, { badge: string; dot: string; label: string }> = {
  completed: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Completed",
  },
  current: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
    label: "Current",
  },
  in_progress: {
    badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    dot: "bg-yellow-500",
    label: "In progress",
  },
  pending_approval: {
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    dot: "bg-orange-500",
    label: "Pending approval",
  },
  cancelled: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
    label: "Cancelled",
  },
  draft: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
    label: "Draft",
  },
};

const TONE_BY_STATUS: Record<LifecycleEntity, Record<string, StatusTone>> = {
  LEAD: {
    NEW: "draft",
    CONTACTED: "in_progress",
    QUALIFIED: "in_progress",
    UNQUALIFIED: "cancelled",
    CONVERTED: "completed",
    LOST: "cancelled",
    CANCELLED: "cancelled",
  },
  OPPORTUNITY: {
    QUALIFICATION: "in_progress",
    DISCOVERY: "in_progress",
    REQUIREMENT_ANALYSIS: "in_progress",
    PROPOSAL_SUBMITTED: "in_progress",
    RFQ_RECEIVED: "in_progress",
    QUOTATION_SENT: "in_progress",
    NEGOTIATION: "in_progress",
    MANAGEMENT_APPROVAL: "pending_approval",
    VERBAL_CONFIRMATION: "in_progress",
    WON: "completed",
    LOST: "cancelled",
    CANCELLED: "cancelled",
  },
  RFQ: {
    DRAFT: "draft",
    RECEIVED: "in_progress",
    IN_PROGRESS: "in_progress",
    QUOTED: "completed",
    CLOSED: "completed",
    CANCELLED: "cancelled",
  },
  QUOTATION: {
    DRAFT: "draft",
    PENDING_APPROVAL: "pending_approval",
    APPROVED: "completed",
    REJECTED: "cancelled",
    SENT: "completed",
    ACCEPTED: "completed",
    DECLINED: "cancelled",
    EXPIRED: "cancelled",
    CANCELLED: "cancelled",
  },
  APPROVAL: {
    PENDING: "pending_approval",
    APPROVED: "completed",
    REJECTED: "cancelled",
    CANCELLED: "cancelled",
  },
  PROJECT: {
    PLANNING: "draft",
    ACTIVE: "in_progress",
    ON_HOLD: "pending_approval",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
};

export function statusTone(entity: LifecycleEntity, status: string): StatusTone {
  return TONE_BY_STATUS[entity]?.[status] ?? "draft";
}

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Terminal, read-only statuses per entity (server guards + UI banners agree). */
export const READ_ONLY_STATUSES: Record<Exclude<LifecycleEntity, "APPROVAL" | "PROJECT">, string[]> = {
  LEAD: ["CANCELLED"],
  OPPORTUNITY: ["CANCELLED"],
  RFQ: ["CANCELLED"],
  QUOTATION: ["CANCELLED"],
};

/** Roles allowed to reopen a cancelled record (requirement #4). */
export const REOPEN_ROLES = ["ADMIN", "SALES_MANAGER", "BUSINESS_HEAD"] as const;

/* -------------------- the seven flow-strip stations -------------------- */

export type FlowStationKey =
  | "LEAD"
  | "OPPORTUNITY"
  | "RFQ"
  | "QUOTATION"
  | "APPROVAL"
  | "AWARD"
  | "PROJECT";

export const FLOW_STATIONS: { key: FlowStationKey; label: string }[] = [
  { key: "LEAD", label: "Lead" },
  { key: "OPPORTUNITY", label: "Opportunity" },
  { key: "RFQ", label: "RFQ" },
  { key: "QUOTATION", label: "Quotation" },
  { key: "APPROVAL", label: "Approval" },
  { key: "AWARD", label: "Won" },
  { key: "PROJECT", label: "Project" },
];

/** Serialized thread station passed from server pages to the flow strip. */
export type ThreadStation = {
  key: FlowStationKey;
  label: string;
  tone: StatusTone | "pending"; // "pending" = station not reached yet (grey outline)
  isCurrent: boolean; // the record whose page you're on (blue highlight)
  record: {
    type: LifecycleEntity;
    id: string;
    number: string;
    title: string;
    status: string;
    href: string | null; // null = no detail page (station is informational)
    date: string | null; // ISO — the station's most meaningful date
  } | null;
  /** e.g. "2 more quotations" when the thread has siblings at this station. */
  siblingNote: string | null;
};

export type LifecycleThreadDTO = {
  stations: ThreadStation[];
  /** Breadcrumb trail: Home > Leads > LEAD-x > OPP-x > … up to the current record. */
  crumbs: { label: string; href: string | null }[];
  cancelled: boolean; // any terminal cancellation on the current record
};
