import { prisma } from "@/lib/prisma";

export type AuditChange = { field: string; from: unknown; to: unknown };

export type AuditInput = {
  organizationId: string;
  entityType: "LEAD" | "OPPORTUNITY" | "QUOTATION" | "RFQ" | "PROJECT";
  entityId: string;
  entityLabel?: string | null;
  action:
    | "CREATED"
    | "UPDATED"
    | "STAGE_CHANGED"
    | "STATUS_CHANGED"
    | "CONVERTED"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED"
    | "DELETED";
  summary?: string;
  changes?: AuditChange[];
  actorId?: string | null;
  actorName?: string | null;
};

/** Write an audit entry. Never throws — auditing must not break the request. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel ?? undefined,
        action: input.action,
        summary: input.summary,
        changes: input.changes && input.changes.length ? (input.changes as object) : undefined,
        actorId: input.actorId ?? undefined,
        actorName: input.actorName ?? undefined,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("audit failed", e);
  }
}

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "toString" in v) return String(v);
  return String(v);
}

/** Compute field-level changes between two records for the given fields. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): AuditChange[] {
  const out: AuditChange[] = [];
  for (const f of fields) {
    if (!(f in after)) continue;
    if (after[f] === undefined) continue; // field not part of this update
    if (norm(before[f]) !== norm(after[f])) {
      out.push({ field: f, from: before[f] ?? null, to: after[f] ?? null });
    }
  }
  return out;
}
