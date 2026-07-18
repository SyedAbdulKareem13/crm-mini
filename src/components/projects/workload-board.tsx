"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* -------------------------------- types ------------------------------- */

export type WorkloadTask = {
  id: string;
  name: string;
  status: string;
  priority?: string | null;
  ownerId: string | null;
  progressPct?: number | null;
  estimateHours?: number | null;
  actualHours?: number | null;
  start: string; // ISO
  end: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  phaseName: string;
};

export type WorkloadMember = { id: string; name: string };

/* ------------------------------- helpers ------------------------------ */

const DAY = 86_400_000;
const WEEKS = 12;
/** More than this many concurrent open tasks (or 40h/wk) reads as overload. */
const TASK_CAP = 2;
const HOURS_CAP = 40;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

type WeekLoad = { tasks: number; hours: number };

/** Weekly load for a set of tasks over the horizon. */
function weeklyLoads(tasks: WorkloadTask[], weeks: Date[]): WeekLoad[] {
  return weeks.map((wk) => {
    const wkEnd = addDays(wk, 7);
    let count = 0;
    let hours = 0;
    for (const t of tasks) {
      const s = new Date(t.start);
      const e = new Date(t.end);
      if (s < wkEnd && e >= wk) {
        count += 1;
        if (t.estimateHours != null && t.estimateHours > 0) {
          const totalWeeks = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (7 * DAY)));
          hours += t.estimateHours / totalWeeks;
        }
      }
    }
    return { tasks: count, hours: Math.round(hours) };
  });
}

function loadTone(l: WeekLoad): string {
  const over = l.tasks > TASK_CAP || l.hours > HOURS_CAP;
  if (over) return "bg-destructive/70 text-destructive-foreground";
  if (l.tasks === 2) return "bg-primary/50 text-primary-foreground";
  if (l.tasks === 1) return "bg-primary/25";
  return "bg-muted/40";
}

const STATUS_BADGE: Record<string, "soft" | "success" | "outline"> = {
  PENDING: "outline",
  IN_PROGRESS: "soft",
  DONE: "success",
};

/* ------------------------------ component ----------------------------- */

export function WorkloadBoard({
  members,
  tasks,
}: {
  members: WorkloadMember[];
  tasks: WorkloadTask[];
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const weeks = React.useMemo(() => {
    const w0 = startOfWeek(new Date());
    return Array.from({ length: WEEKS }, (_, i) => addDays(w0, i * 7));
  }, []);

  // Open (not DONE) tasks consume capacity; DONE stays visible in the detail rows.
  const open = tasks.filter((t) => t.status !== "DONE");

  const rows = React.useMemo(() => {
    const list = members.map((m) => {
      const mine = open.filter((t) => t.ownerId === m.id);
      const loads = weeklyLoads(mine, weeks);
      return {
        id: m.id,
        name: m.name,
        openTasks: mine,
        allTasks: tasks.filter((t) => t.ownerId === m.id),
        loads,
        projects: new Set(mine.map((t) => t.projectId)).size,
        estHours: Math.round(mine.reduce((n, t) => n + (t.estimateHours ?? 0), 0)),
        overloaded: loads.some((l) => l.tasks > TASK_CAP || l.hours > HOURS_CAP),
      };
    });
    // Overloaded members first, then by open work desc.
    list.sort((a, b) => Number(b.overloaded) - Number(a.overloaded) || b.openTasks.length - a.openTasks.length);
    const unassignedTasks = open.filter((t) => !t.ownerId);
    return { list, unassignedTasks, unassignedLoads: weeklyLoads(unassignedTasks, weeks) };
  }, [members, open, tasks, weeks]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const overloadedCount = rows.list.filter((r) => r.overloaded).length;

  return (
    <div className="space-y-4">
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Members", value: members.length, cls: "" },
          { label: "Open tasks", value: open.length, cls: "" },
          { label: "Overloaded", value: overloadedCount, cls: overloadedCount ? "text-destructive" : "text-muted-foreground" },
          { label: "Unassigned", value: rows.unassignedTasks.length, cls: rows.unassignedTasks.length ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card/60 px-4 py-3">
            <div className={cn("font-display text-2xl font-semibold tabular-nums", s.cls)}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* heatmap */}
      <div className="w-full max-w-full overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-[220px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Member
                </th>
                {weeks.map((wk, i) => (
                  <th
                    key={i}
                    className="px-1 py-2 text-center text-[9px] font-medium tabular-nums text-muted-foreground"
                  >
                    {fmt(wk)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.list.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-b hover:bg-muted/20">
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="flex w-full items-center gap-1.5 text-left"
                      >
                        {expanded.has(r.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate font-medium">{r.name}</span>
                        {r.overloaded && <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {r.openTasks.length} task{r.openTasks.length === 1 ? "" : "s"} · {r.projects} prj
                          {r.estHours ? ` · ${r.estHours}h` : ""}
                        </span>
                      </button>
                    </td>
                    {r.loads.map((l, i) => (
                      <td key={i} className="p-0.5">
                        <div
                          className={cn(
                            "flex h-7 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                            loadTone(l)
                          )}
                          title={`${fmt(weeks[i])}: ${l.tasks} task${l.tasks === 1 ? "" : "s"}${l.hours ? ` · ~${l.hours}h` : ""}${l.tasks > TASK_CAP || l.hours > HOURS_CAP ? " · OVERLOADED" : ""}`}
                        >
                          {l.tasks > 0 ? l.tasks : ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {expanded.has(r.id) && (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={WEEKS + 1} className="px-3 py-2">
                        {r.allTasks.length === 0 ? (
                          <p className="py-1 text-xs text-muted-foreground">No tasks assigned.</p>
                        ) : (
                          <ul className="space-y-1">
                            {r.allTasks.map((t) => (
                              <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs">
                                <Badge variant={STATUS_BADGE[t.status] ?? "outline"} className="text-[9px]">
                                  {t.status === "IN_PROGRESS"
                                    ? `${t.progressPct ?? 0}%`
                                    : t.status.toLowerCase().replace("_", " ")}
                                </Badge>
                                <span className={cn("font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>
                                  {t.name}
                                </span>
                                <Link
                                  href={`/app/projects/${t.projectId}`}
                                  className="text-primary hover:underline"
                                >
                                  {t.projectNumber}
                                </Link>
                                <span className="text-muted-foreground">
                                  {t.phaseName} · {fmt(new Date(t.start))}–{fmt(new Date(t.end))}
                                  {t.estimateHours != null ? ` · est ${t.estimateHours}h` : ""}
                                  {t.actualHours != null ? ` · actual ${t.actualHours}h` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* unassigned pool */}
              {rows.unassignedTasks.length > 0 && (
                <React.Fragment>
                  <tr className="border-b bg-amber-500/5 hover:bg-amber-500/10">
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggle("__unassigned__")}
                        className="flex w-full items-center gap-1.5 text-left"
                      >
                        {expanded.has("__unassigned__") ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate font-medium text-amber-700 dark:text-amber-400">Unassigned</span>
                        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {rows.unassignedTasks.length} task{rows.unassignedTasks.length === 1 ? "" : "s"}
                        </span>
                      </button>
                    </td>
                    {rows.unassignedLoads.map((l, i) => (
                      <td key={i} className="p-0.5">
                        <div
                          className={cn(
                            "flex h-7 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                            l.tasks > 0 ? "bg-amber-500/25" : "bg-muted/40"
                          )}
                          title={`${fmt(weeks[i])}: ${l.tasks} unassigned task${l.tasks === 1 ? "" : "s"}`}
                        >
                          {l.tasks > 0 ? l.tasks : ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {expanded.has("__unassigned__") && (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={WEEKS + 1} className="px-3 py-2">
                        <ul className="space-y-1">
                          {rows.unassignedTasks.map((t) => (
                            <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-medium">{t.name}</span>
                              <Link href={`/app/projects/${t.projectId}`} className="text-primary hover:underline">
                                {t.projectNumber}
                              </Link>
                              <span className="text-muted-foreground">
                                {t.phaseName} · {fmt(new Date(t.start))}–{fmt(new Date(t.end))} — assign it from the
                                project's Gantt
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )}

              {rows.list.length === 0 && (
                <tr>
                  <td colSpan={WEEKS + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No active members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-muted/40" /> free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary/25" /> 1 task
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary/50" /> 2 tasks
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-destructive/70" /> overloaded (&gt;{TASK_CAP} concurrent or &gt;{HOURS_CAP}h/wk)
        </span>
        <span className="ml-auto">
          Cell = concurrent open tasks that week; hours spread estimate evenly across a task's duration.
        </span>
      </div>
    </div>
  );
}
