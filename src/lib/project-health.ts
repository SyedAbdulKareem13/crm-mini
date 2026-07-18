/**
 * Project health — a pure, shared computation (server list + client planner).
 * ON_TRACK: nothing overdue. AT_RISK: some deliverables past due. DELAYED: a
 * whole phase window has elapsed without completing.
 */

type HealthPhase = {
  status: string;
  durationWeeks: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  deliverables: { status: string; endDate?: string | Date | null }[];
};

export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "ON_HOLD";

export const HEALTH_META: Record<ProjectHealth, { label: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  ON_TRACK: { label: "On track", tone: "success" },
  AT_RISK: { label: "At risk", tone: "warning" },
  DELAYED: { label: "Delayed", tone: "destructive" },
  COMPLETED: { label: "Completed", tone: "muted" },
  ON_HOLD: { label: "On hold", tone: "muted" },
};

const DAY = 86_400_000;

export function computeProjectHealth(
  projectStatus: string,
  projectStart: string | Date | null,
  phases: HealthPhase[]
): ProjectHealth {
  if (projectStatus === "COMPLETED") return "COMPLETED";
  if (projectStatus === "ON_HOLD" || projectStatus === "CANCELLED") return "ON_HOLD";

  const today = new Date();
  const anchor = projectStart ? new Date(projectStart) : new Date();
  let cursor = anchor;
  let delayed = false;
  let atRisk = false;

  for (const p of phases) {
    const start = p.startDate ? new Date(p.startDate) : cursor;
    const end = p.endDate
      ? new Date(p.endDate)
      : new Date(start.getTime() + Math.max(1, p.durationWeeks) * 7 * DAY);
    cursor = end;
    if (p.status !== "COMPLETED" && end < today) delayed = true;
    for (const d of p.deliverables) {
      const de = d.endDate ? new Date(d.endDate) : end;
      if (d.status !== "DONE" && de < today) atRisk = true;
    }
  }

  if (delayed) return "DELAYED";
  if (atRisk) return "AT_RISK";
  return "ON_TRACK";
}
