/**
 * Executive Dashboard data (PPT slide 11) — presales + delivery leadership
 * view. Every widget reuses the same source of truth as its feature page so
 * numbers never disagree:
 *  - Project Health → computeProjectHealth (projects list / planner chip)
 *  - Resource Utilization / Delivery Capacity → the workload view's
 *    task-window resolution and overload thresholds
 *  - Gross Margin → stored quotation totals (quotation engine)
 *  - Revenue Forecast / Win Probability → opportunity expectedRevenue ×
 *    probability (same as the existing KPI)
 */

import { prisma } from "@/lib/prisma";
import { computeProjectHealth, type ProjectHealth } from "@/lib/project-health";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

/** Same thresholds as the workload board. */
const TASK_CAP = 2;

export type ExecDashboardData = {
  pipelineByProduct: { name: string; count: number; value: number }[];
  forecastByMonth: { month: string; weighted: number; deals: number }[];
  forecastTotal: number;
  utilization: {
    members: number;
    busy: number;
    overloaded: number;
    unassignedTasks: number;
    pct: number; // busy / members
  };
  winProbability: {
    avgOpenProbability: number; // value-weighted, open deals
    realizedWinRate: number; // historical won/(won+lost)
    openDeals: number;
  };
  grossMargin: {
    avgMarginPct: number; // across active quotes
    totalProfit: number;
    quotes: number;
  };
  projectHealth: { health: ProjectHealth; count: number }[];
  durationBenchmarks: {
    methodology: string;
    baselineWeeks: number;
    avgActualWeeks: number;
    projects: number;
  }[];
  capacity: {
    members: number;
    slotsTotal: number; // members × TASK_CAP
    slotsUsed: number; // concurrent open tasks this week (assigned)
    slotsFree: number;
    pct: number;
  };
};

export async function getExecDashboard(organizationId: string): Promise<ExecDashboardData> {
  const [openOpps, closedOpps, activeQuotes, members, projects, methodologies] = await Promise.all([
    prisma.opportunity.findMany({
      where: { organizationId, NOT: { stage: { in: ["WON", "LOST"] } } },
      select: {
        expectedRevenue: true,
        probability: true,
        expectedCloseDate: true,
        project: { select: { transformationType: { select: { name: true } } } },
      },
    }),
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: { organizationId, stage: { in: ["WON", "LOST"] } },
      _count: { _all: true },
    }),
    prisma.quotation.findMany({
      where: { organizationId, status: { in: ["SENT", "APPROVED", "ACCEPTED", "PENDING_APPROVAL"] } },
      select: { marginPct: true, profitAmount: true },
    }),
    prisma.user.count({ where: { organizationId, isActive: true } }),
    prisma.project.findMany({
      where: { organizationId },
      select: {
        status: true,
        startDate: true,
        methodology: { select: { id: true, name: true } },
        phases: {
          orderBy: { position: "asc" },
          select: {
            status: true,
            durationWeeks: true,
            startDate: true,
            endDate: true,
            deliverables: {
              select: { status: true, ownerId: true, startDate: true, endDate: true },
            },
          },
        },
      },
    }),
    prisma.methodology.findMany({
      where: { organizationId },
      select: { id: true, name: true, phases: { where: { active: true }, select: { durationWeeks: true } } },
    }),
  ]);

  /* ---------------- Pipeline by SAP product (transformation type) -------- */
  const byProduct = new Map<string, { count: number; value: number }>();
  for (const o of openOpps) {
    const name = o.project?.transformationType?.name ?? "Not yet classified";
    const cur = byProduct.get(name) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(o.expectedRevenue);
    byProduct.set(name, cur);
  }
  const pipelineByProduct = [...byProduct.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  /* ------------------- Revenue forecast (next 6 months) ------------------ */
  const now = new Date();
  const forecastByMonth: { month: string; weighted: number; deals: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecastByMonth.push({ month: d.toLocaleString("en-IN", { month: "short" }), weighted: 0, deals: 0 });
  }
  let unscheduled = 0;
  let forecastTotal = 0;
  for (const o of openOpps) {
    const weighted = Number(o.expectedRevenue) * (o.probability / 100);
    forecastTotal += weighted;
    if (!o.expectedCloseDate) {
      unscheduled += weighted;
      continue;
    }
    const idx =
      (o.expectedCloseDate.getFullYear() - now.getFullYear()) * 12 +
      (o.expectedCloseDate.getMonth() - now.getMonth());
    if (idx >= 0 && idx < 6) {
      forecastByMonth[idx].weighted += weighted;
      forecastByMonth[idx].deals += 1;
    }
  }
  if (unscheduled > 0) {
    forecastByMonth.push({ month: "No date", weighted: unscheduled, deals: openOpps.filter((o) => !o.expectedCloseDate).length });
  }

  /* ------- Resource utilization + delivery capacity (this week) ---------- */
  const wk = startOfWeek(now);
  const wkEnd = addDays(wk, 7);
  const perOwner = new Map<string, number>();
  let unassignedTasks = 0;
  for (const project of projects) {
    if (!["PLANNING", "ACTIVE", "ON_HOLD"].includes(project.status)) continue;
    let cursor = startOfDay(project.startDate ?? now);
    for (const phase of project.phases) {
      const pStart = phase.startDate ? startOfDay(phase.startDate) : cursor;
      const pEndRaw = phase.endDate
        ? startOfDay(phase.endDate)
        : addDays(pStart, Math.max(1, phase.durationWeeks) * 7);
      const pEnd = pEndRaw <= pStart ? addDays(pStart, 7) : pEndRaw;
      cursor = pEnd;
      for (const t of phase.deliverables) {
        if (t.status === "DONE") continue;
        const s = t.startDate ? startOfDay(t.startDate) : pStart;
        const e = t.endDate ? startOfDay(t.endDate) : t.startDate ? addDays(s, 7) : pEnd;
        if (s < wkEnd && e >= wk) {
          if (t.ownerId) perOwner.set(t.ownerId, (perOwner.get(t.ownerId) ?? 0) + 1);
          else unassignedTasks += 1;
        }
      }
    }
  }
  const busy = perOwner.size;
  const overloaded = [...perOwner.values()].filter((n) => n > TASK_CAP).length;
  const slotsTotal = members * TASK_CAP;
  const slotsUsed = [...perOwner.values()].reduce((a, b) => a + b, 0);

  /* --------------------------- Win probability --------------------------- */
  const openValue = openOpps.reduce((n, o) => n + Number(o.expectedRevenue), 0);
  const avgOpenProbability =
    openValue > 0
      ? Math.round(openOpps.reduce((n, o) => n + Number(o.expectedRevenue) * o.probability, 0) / openValue)
      : openOpps.length
        ? Math.round(openOpps.reduce((n, o) => n + o.probability, 0) / openOpps.length)
        : 0;
  const won = closedOpps.find((c) => c.stage === "WON")?._count._all ?? 0;
  const lost = closedOpps.find((c) => c.stage === "LOST")?._count._all ?? 0;
  const realizedWinRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  /* ----------------------------- Gross margin ---------------------------- */
  const avgMarginPct = activeQuotes.length
    ? Math.round((activeQuotes.reduce((n, q) => n + Number(q.marginPct), 0) / activeQuotes.length) * 10) / 10
    : 0;
  const totalProfit = activeQuotes.reduce((n, q) => n + Number(q.profitAmount), 0);

  /* ---------------------------- Project health --------------------------- */
  const healthCounts = new Map<ProjectHealth, number>();
  for (const p of projects) {
    const h = computeProjectHealth(p.status, p.startDate, p.phases);
    healthCounts.set(h, (healthCounts.get(h) ?? 0) + 1);
  }
  const projectHealth = (["ON_TRACK", "AT_RISK", "DELAYED", "ON_HOLD", "COMPLETED"] as ProjectHealth[])
    .filter((h) => (healthCounts.get(h) ?? 0) > 0)
    .map((h) => ({ health: h, count: healthCounts.get(h)! }));

  /* -------------------------- Duration benchmarks ------------------------ */
  const durationBenchmarks = methodologies
    .map((m) => {
      const baselineWeeks = m.phases.reduce((n, p) => n + p.durationWeeks, 0);
      const mine = projects.filter((p) => p.methodology?.id === m.id);
      const avgActualWeeks = mine.length
        ? Math.round(
            mine.reduce((n, p) => n + p.phases.reduce((x, ph) => x + ph.durationWeeks, 0), 0) / mine.length
          )
        : 0;
      return { methodology: m.name, baselineWeeks, avgActualWeeks, projects: mine.length };
    })
    .filter((b) => b.baselineWeeks > 0);

  return {
    pipelineByProduct,
    forecastByMonth,
    forecastTotal,
    utilization: {
      members,
      busy,
      overloaded,
      unassignedTasks,
      pct: members > 0 ? Math.round((busy / members) * 100) : 0,
    },
    winProbability: { avgOpenProbability, realizedWinRate, openDeals: openOpps.length },
    grossMargin: { avgMarginPct, totalProfit, quotes: activeQuotes.length },
    projectHealth,
    durationBenchmarks,
    capacity: {
      members,
      slotsTotal,
      slotsUsed,
      slotsFree: Math.max(0, slotsTotal - slotsUsed),
      pct: slotsTotal > 0 ? Math.min(100, Math.round((slotsUsed / slotsTotal) * 100)) : 0,
    },
  };
}
