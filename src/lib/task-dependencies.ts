/**
 * Task dependencies (finish-to-start) — server-side engine.
 *
 * - `pathExists`: cycle guard for new links (adding P→S is illegal when S
 *   can already reach P through existing links).
 * - `enforceProjectDependencies`: resolves every task's window (explicit
 *   dates, else its phase window derived exactly like the Gantt), then walks
 *   the dependency graph in topological order and forward-shifts any
 *   successor that would start before a predecessor ends. Shifts preserve
 *   duration, are persisted as explicit dates, and cascade down the chain.
 */

import { prisma } from "@/lib/prisma";
import { getPipelineGates } from "@/lib/sap-config";
import { parseCalendar, nextWorkingDay } from "@/lib/workdays";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export type DepEdge = { predecessorId: string; successorId: string };

/** True when `from` can reach `to` following predecessor→successor edges. */
export function pathExists(edges: DepEdge[], from: string, to: string): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.predecessorId) ?? [];
    list.push(e.successorId);
    adj.set(e.predecessorId, list);
  }
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) return true;
    for (const next of adj.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

export type ShiftedTask = { id: string; name: string; startDate: string; endDate: string };

/** Load every dependency edge across a project's deliverables. */
export async function projectDependencyEdges(projectId: string): Promise<DepEdge[]> {
  const deps = await prisma.projectTaskDependency.findMany({
    where: { predecessor: { phase: { projectId } } },
    select: { predecessorId: true, successorId: true },
  });
  return deps;
}

/**
 * Enforce FS links for a whole project. Returns the tasks whose dates were
 * shifted (already persisted). Safe no-op when there are no links.
 */
export async function enforceProjectDependencies(projectId: string): Promise<ShiftedTask[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      startDate: true,
      organizationId: true,
      phases: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          durationWeeks: true,
          startDate: true,
          endDate: true,
          deliverables: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
        },
      },
    },
  });
  if (!project) return [];

  const edges = await projectDependencyEdges(projectId);
  if (edges.length === 0) return [];

  // Org working-day calendar: auto-shifted tasks never land on a weekend/holiday.
  const gates = await getPipelineGates(project.organizationId);
  const cal = parseCalendar(gates.workingDays, gates.holidays);

  // Resolve windows the same way the Gantt derives them.
  type Win = { id: string; name: string; start: Date; end: Date; explicit: boolean };
  const windows = new Map<string, Win>();
  let cursor = startOfDay(project.startDate ?? new Date());
  for (const phase of project.phases) {
    const pStart = phase.startDate ? startOfDay(phase.startDate) : cursor;
    const pEndRaw = phase.endDate
      ? startOfDay(phase.endDate)
      : addDays(pStart, Math.max(1, phase.durationWeeks) * 7);
    const pEnd = pEndRaw <= pStart ? addDays(pStart, 7) : pEndRaw;
    cursor = pEnd;
    for (const d of phase.deliverables) {
      const ds = d.startDate ? startOfDay(d.startDate) : pStart;
      const de = d.endDate ? startOfDay(d.endDate) : d.startDate ? addDays(ds, 7) : pEnd;
      windows.set(d.id, {
        id: d.id,
        name: d.name,
        start: ds,
        end: de < ds ? addDays(ds, 1) : de,
        explicit: !!(d.startDate || d.endDate),
      });
    }
  }

  // Topological order (Kahn). A cycle can't be created through the API, but
  // guard anyway: on a cycle we simply skip enforcement.
  const preds = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const w of windows.keys()) indeg.set(w, 0);
  for (const e of edges) {
    if (!windows.has(e.predecessorId) || !windows.has(e.successorId)) continue;
    (succ.get(e.predecessorId) ?? succ.set(e.predecessorId, []).get(e.predecessorId)!).push(e.successorId);
    (preds.get(e.successorId) ?? preds.set(e.successorId, []).get(e.successorId)!).push(e.predecessorId);
    indeg.set(e.successorId, (indeg.get(e.successorId) ?? 0) + 1);
  }
  const queue = [...indeg.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const s of succ.get(id) ?? []) {
      indeg.set(s, (indeg.get(s) ?? 1) - 1);
      if ((indeg.get(s) ?? 0) === 0) queue.push(s);
    }
  }
  if (order.length !== windows.size) return []; // cycle — skip rather than corrupt

  const shifted: ShiftedTask[] = [];
  for (const id of order) {
    const mine = windows.get(id)!;
    const myPreds = preds.get(id) ?? [];
    if (!myPreds.length) continue;
    const maxPredEnd = new Date(Math.max(...myPreds.map((p) => windows.get(p)!.end.getTime())));
    if (maxPredEnd >= mine.start) {
      const duration = Math.max(DAY, mine.end.getTime() - mine.start.getTime());
      const newStart = nextWorkingDay(addDays(startOfDay(maxPredEnd), 1), cal);
      const newEnd = new Date(newStart.getTime() + duration);
      windows.set(id, { ...mine, start: newStart, end: newEnd, explicit: true });
      shifted.push({
        id,
        name: mine.name,
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
      });
    }
  }

  for (const s of shifted) {
    await prisma.projectDeliverable.update({
      where: { id: s.id },
      data: { startDate: new Date(s.startDate), endDate: new Date(s.endDate) },
    });
  }
  return shifted;
}
