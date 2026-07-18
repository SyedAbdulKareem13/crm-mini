"use client";

import * as React from "react";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Flag,
  GitBranch,
  History,
  Loader2,
  Route,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { buildMspdiXml, buildExcelXml, downloadText } from "@/lib/plan-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlannerProject, PlannerPhase, PlannerDeliverable } from "./project-planner";

/* ----------------------------- scheduling ----------------------------- */

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
/** Monday of the week containing d. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export type BaselineData = {
  takenAt: string;
  takenBy?: string | null;
  tasks: Record<string, { start: string; end: string }>;
  phases: Record<string, { start: string; end: string }>;
};

export type ScheduledDeliverable = PlannerDeliverable & { start: Date; end: Date };
export type ScheduledPhase = PlannerPhase & {
  start: Date;
  end: Date;
  items: ScheduledDeliverable[];
  pct: number;
};

const taskProgress = (d: PlannerDeliverable) => (d.status === "DONE" ? 100 : d.progressPct ?? 0);

/** Topological order over items connected by predecessorIds (Kahn). Returns
 *  null on a cycle (the API prevents them; render defensively anyway). */
function topoOrder(items: ScheduledDeliverable[]): ScheduledDeliverable[] | null {
  const byId = new Map(items.map((i) => [i.id, i]));
  const indeg = new Map<string, number>(items.map((i) => [i.id, 0]));
  const succ = new Map<string, string[]>();
  for (const i of items) {
    for (const pid of i.predecessorIds ?? []) {
      if (!byId.has(pid)) continue;
      indeg.set(i.id, (indeg.get(i.id) ?? 0) + 1);
      (succ.get(pid) ?? succ.set(pid, []).get(pid)!).push(i.id);
    }
  }
  const queue = items.filter((i) => (indeg.get(i.id) ?? 0) === 0).map((i) => i.id);
  const order: ScheduledDeliverable[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(byId.get(id)!);
    for (const s of succ.get(id) ?? []) {
      indeg.set(s, (indeg.get(s) ?? 1) - 1);
      if ((indeg.get(s) ?? 0) === 0) queue.push(s);
    }
  }
  return order.length === items.length ? order : null;
}

/**
 * Derive the schedule from configuration: phases run back-to-back from the
 * project start date using their configured durations; explicit start/end
 * dates on a phase or deliverable override the derived window. Finish-to-start
 * dependencies then pull successors forward so no task starts before its
 * predecessors end (mirrors the server-side auto-shift).
 */
export function computeSchedule(project: PlannerProject): ScheduledPhase[] {
  const anchor = startOfDay(project.startDate ? new Date(project.startDate) : new Date());
  let cursor = anchor;
  const phases = project.phases.map((phase) => {
    const start = phase.startDate ? startOfDay(new Date(phase.startDate)) : cursor;
    const end = phase.endDate
      ? startOfDay(new Date(phase.endDate))
      : addDays(start, Math.max(1, phase.durationWeeks) * 7);
    cursor = end;
    const items: ScheduledDeliverable[] = phase.deliverables.map((d) => {
      const ds = d.startDate ? startOfDay(new Date(d.startDate)) : start;
      const de = d.endDate ? startOfDay(new Date(d.endDate)) : d.startDate ? addDays(ds, 7) : end;
      return { ...d, start: ds, end: de < ds ? addDays(ds, 1) : de };
    });
    return { ...phase, start, end: end <= start ? addDays(start, 7) : end, items, pct: 0 };
  });

  // FS constraint pass: successors start after their latest predecessor ends.
  const all = phases.flatMap((p) => p.items);
  const byId = new Map(all.map((i) => [i.id, i]));
  const order = topoOrder(all);
  if (order) {
    for (const item of order) {
      const preds = (item.predecessorIds ?? []).map((pid) => byId.get(pid)).filter(Boolean) as ScheduledDeliverable[];
      if (!preds.length) continue;
      const maxPredEnd = new Date(Math.max(...preds.map((p) => p.end.getTime())));
      if (maxPredEnd >= item.start) {
        const duration = Math.max(DAY, item.end.getTime() - item.start.getTime());
        item.start = addDays(startOfDay(maxPredEnd), 1);
        item.end = new Date(item.start.getTime() + duration);
      }
    }
  }

  for (const p of phases) {
    p.pct = p.items.length
      ? Math.round(p.items.reduce((n, i) => n + taskProgress(i), 0) / p.items.length)
      : p.status === "COMPLETED"
        ? 100
        : 0;
  }
  return phases;
}

/**
 * Critical path (CPM): among tasks connected by FS links, the chain with the
 * longest total duration. Returns the ids of every task on a maximal chain.
 */
export function computeCriticalPath(phases: ScheduledPhase[]): Set<string> {
  const items = phases.flatMap((p) => p.items);
  const byId = new Map(items.map((i) => [i.id, i]));
  const linked = new Set<string>();
  for (const i of items) {
    for (const pid of i.predecessorIds ?? []) {
      if (byId.has(pid)) {
        linked.add(i.id);
        linked.add(pid);
      }
    }
  }
  if (!linked.size) return new Set();
  const order = topoOrder(items);
  if (!order) return new Set();
  const dur = (i: ScheduledDeliverable) => Math.max(1, Math.round((i.end.getTime() - i.start.getTime()) / DAY));

  // Longest chain ending at / starting from each node (own duration included).
  const to = new Map<string, number>();
  for (const i of order) {
    const preds = (i.predecessorIds ?? []).filter((p) => byId.has(p));
    to.set(i.id, dur(i) + Math.max(0, ...preds.map((p) => to.get(p) ?? 0)));
  }
  const succ = new Map<string, string[]>();
  for (const i of items) {
    for (const pid of i.predecessorIds ?? []) {
      if (byId.has(pid)) (succ.get(pid) ?? succ.set(pid, []).get(pid)!).push(i.id);
    }
  }
  const from = new Map<string, number>();
  for (const i of [...order].reverse()) {
    const succs = succ.get(i.id) ?? [];
    from.set(i.id, dur(i) + Math.max(0, ...succs.map((s) => from.get(s) ?? 0)));
  }
  const maxChain = Math.max(...items.filter((i) => linked.has(i.id)).map((i) => (to.get(i.id) ?? 0) + (from.get(i.id) ?? 0) - dur(i)));
  return new Set(
    items
      .filter((i) => linked.has(i.id) && (to.get(i.id) ?? 0) + (from.get(i.id) ?? 0) - dur(i) === maxChain)
      .map((i) => i.id)
  );
}

/* ------------------------------- helpers ------------------------------ */

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "text-muted-foreground" },
  MEDIUM: { label: "Medium", className: "text-info" },
  HIGH: { label: "High", className: "text-warning" },
  CRITICAL: { label: "Critical", className: "text-destructive" },
};

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtFull = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------ component ----------------------------- */

type DragState = {
  id: string;
  mode: "move" | "end";
  startX: number;
  dxDays: number;
};

export function ProjectGantt({
  project,
  members,
  busy,
  onPatch,
  onDependency,
  baseline = null,
  onBaseline,
}: {
  project: PlannerProject;
  members: { id: string; name: string | null }[];
  busy: Set<string>;
  onPatch: (body: Record<string, unknown>, busyKey: string) => Promise<boolean>;
  onDependency?: (
    action: "add" | "remove",
    predecessorId: string,
    successorId: string
  ) => Promise<boolean>;
  baseline?: BaselineData | null;
  onBaseline?: (action: "set" | "clear") => Promise<boolean>;
}) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [weekPx, setWeekPx] = React.useState(44);
  const [showCritical, setShowCritical] = React.useState(false);
  const [showBaseline, setShowBaseline] = React.useState(true);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const phases = React.useMemo(() => computeSchedule(project), [project]);
  const critical = React.useMemo(() => computeCriticalPath(phases), [phases]);
  const hasDeps = React.useMemo(
    () => phases.some((p) => p.items.some((i) => (i.predecessorIds ?? []).length > 0)),
    [phases]
  );
  const allTasks = React.useMemo(
    () => phases.flatMap((p) => p.items.map((i) => ({ id: i.id, name: i.name, phaseName: p.name }))),
    [phases]
  );
  const today = startOfDay(new Date());

  // Time range: from the earliest start to the latest end (today always visible), padded a week each side.
  const range = React.useMemo(() => {
    const starts = phases.map((p) => p.start.getTime());
    const ends = phases.flatMap((p) => [p.end.getTime(), ...p.items.map((i) => i.end.getTime())]);
    const min = startOfWeek(new Date(Math.min(...(starts.length ? starts : [today.getTime()]), today.getTime())));
    const maxT = Math.max(...(ends.length ? ends : [today.getTime()]), today.getTime());
    const from = addDays(min, -7);
    const weeks = Math.max(8, Math.ceil((maxT - from.getTime()) / (7 * DAY)) + 2);
    return { from, weeks };
  }, [phases, today]);

  const totalWidth = range.weeks * weekPx;
  const x = (d: Date) => ((d.getTime() - range.from.getTime()) / (7 * DAY)) * weekPx;
  const w = (a: Date, b: Date) => Math.max(6, x(b) - x(a));
  const todayX = x(today) + weekPx / 14; // centre of today within its week

  /* --------------------- drag-to-reschedule (bars) --------------------- */
  const pxPerDay = weekPx / 7;
  const dragRef = React.useRef<DragState | null>(null);
  const updateDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };
  function barPointerDown(e: React.PointerEvent, item: ScheduledDeliverable) {
    if (busy.has(item.id) || e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const mode: "move" | "end" = e.clientX > rect.right - 12 ? "end" : "move";
    el.setPointerCapture(e.pointerId);
    updateDrag({ id: item.id, mode, startX: e.clientX, dxDays: 0 });
  }
  function barPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = Math.round((e.clientX - d.startX) / pxPerDay);
    if (dx !== d.dxDays) updateDrag({ ...d, dxDays: dx });
  }
  function barPointerUp(item: ScheduledDeliverable) {
    const d = dragRef.current;
    updateDrag(null);
    if (!d || d.id !== item.id || d.dxDays === 0) return;
    const shift = d.dxDays * DAY;
    let ns = item.start;
    let ne = item.end;
    if (d.mode === "move") {
      ns = new Date(item.start.getTime() + shift);
      ne = new Date(item.end.getTime() + shift);
    } else {
      ne = new Date(Math.max(item.start.getTime() + DAY, item.end.getTime() + shift));
    }
    void onPatch(
      { deliverable: { id: item.id, startDate: toDateInput(ns), endDate: toDateInput(ne) } },
      item.id
    );
  }

  // Month header spans.
  const months = React.useMemo(() => {
    const out: { label: string; weeks: number }[] = [];
    for (let i = 0; i < range.weeks; i++) {
      const wk = addDays(range.from, i * 7);
      const label = wk.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const last = out[out.length - 1];
      if (last && last.label === label) last.weeks += 1;
      else out.push({ label, weeks: 1 });
    }
    return out;
  }, [range]);

  // Scroll today into view on mount.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePhase = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ------------------------------ export ------------------------------ */

  function exportCsv() {
    const nameOf = (tid: string) => allTasks.find((t) => t.id === tid)?.name ?? tid;
    const rows: string[][] = [
      ["Type", "Phase", "Item", "Status", "% Complete", "Priority", "Assignee", "Start", "End", "Duration (days)", "Est. hours", "Actual hours", "Predecessors", "Critical path"],
    ];
    for (const p of phases) {
      rows.push([
        "Phase", p.name, "", p.status, `${p.pct}`, "", "",
        fmtFull(p.start), fmtFull(p.end),
        String(Math.round((p.end.getTime() - p.start.getTime()) / DAY)),
        "", "", "", "",
      ]);
      for (const i of p.items) {
        rows.push([
          "Deliverable", p.name, i.name, i.status, `${taskProgress(i)}`, i.priority ?? "MEDIUM", i.ownerName ?? "",
          fmtFull(i.start), fmtFull(i.end),
          String(Math.round((i.end.getTime() - i.start.getTime()) / DAY)),
          i.estimateHours != null ? String(i.estimateHours) : "",
          i.actualHours != null ? String(i.actualHours) : "",
          (i.predecessorIds ?? []).map(nameOf).join("; "),
          critical.has(i.id) ? "YES" : "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.projectNumber}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ render ------------------------------ */

  const ROW_H = 40;
  const rows: { kind: "phase" | "item"; phase: ScheduledPhase; item?: ScheduledDeliverable }[] = [];
  for (const p of phases) {
    rows.push({ kind: "phase", phase: p });
    if (!collapsed.has(p.id)) for (const i of p.items) rows.push({ kind: "item", phase: p, item: i });
  }

  // Dependency connectors between visible rows (skip when a phase is collapsed).
  const itemsById = new Map(phases.flatMap((p) => p.items).map((i) => [i.id, i]));
  const rowY = new Map<string, number>();
  rows.forEach((r, idx) => {
    if (r.kind === "item") rowY.set(r.item!.id, idx * ROW_H + ROW_H / 2);
  });
  const connectors: { x1: number; y1: number; x2: number; y2: number; onCritical: boolean }[] = [];
  for (const i of itemsById.values()) {
    for (const pid of i.predecessorIds ?? []) {
      const pred = itemsById.get(pid);
      const y1 = rowY.get(pid);
      const y2 = rowY.get(i.id);
      if (!pred || y1 === undefined || y2 === undefined) continue;
      connectors.push({
        x1: x(pred.end),
        y1,
        x2: x(i.start),
        y2,
        onCritical: critical.has(i.id) && critical.has(pid),
      });
    }
  }

  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No roadmap phases on this project.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {fmtFull(phases[0].start)} → {fmtFull(phases[phases.length - 1].end)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={showCritical ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setShowCritical((v) => !v)}
            disabled={!hasDeps}
            title={
              hasDeps
                ? "Highlight the longest dependency chain"
                : "Link tasks (predecessors) to compute the critical path"
            }
          >
            <Route className="h-3.5 w-3.5" /> Critical path
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(phases.map((p) => p.id)))}
          >
            {collapsed.size ? "Expand all" : "Collapse all"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekPx((v) => Math.max(24, v - 10))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekPx((v) => Math.min(84, v + 10))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          {onBaseline && (
            <>
              {baseline && (
                <Button
                  variant={showBaseline ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setShowBaseline((v) => !v)}
                  title={`Baseline taken ${new Date(baseline.takenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${baseline.takenBy ? ` by ${baseline.takenBy}` : ""}`}
                >
                  <History className="h-3.5 w-3.5" /> Baseline
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => void onBaseline("set")}
                title={baseline ? "Replace the baseline with the current schedule" : "Snapshot the current schedule as the baseline"}
              >
                <Camera className="h-3.5 w-3.5" /> {baseline ? "Re-baseline" : "Set baseline"}
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  downloadText(
                    `${project.projectNumber}.xml`,
                    "application/xml",
                    buildMspdiXml(project.name, project.projectNumber, phases)
                  )
                }
              >
                MS Project (.xml)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  downloadText(
                    `${project.projectNumber}-schedule.xls`,
                    "application/vnd.ms-excel",
                    buildExcelXml(
                      project.name,
                      project.projectNumber,
                      phases,
                      (tid) => allTasks.find((t) => t.id === tid)?.name ?? tid
                    )
                  )
                }
              >
                Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/projects/${project.id}/plan`}>
                  <FileText className="h-3.5 w-3.5" /> PDF (print view)
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden rounded-2xl border">
        <div className="flex w-full max-w-full">
          {/* -------- fixed name column -------- */}
          <div className="w-[190px] shrink-0 border-r bg-card/60 sm:w-[270px]">
            <div className="flex h-[52px] items-end border-b px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Task
            </div>
            {rows.map((r) =>
              r.kind === "phase" ? (
                <button
                  key={r.phase.id}
                  type="button"
                  onClick={() => togglePhase(r.phase.id)}
                  className="flex w-full items-center gap-1.5 border-b bg-muted/30 px-2 text-left"
                  style={{ height: ROW_H }}
                >
                  {collapsed.has(r.phase.id) ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: r.phase.color }} />
                  <span className="truncate text-sm font-semibold">{r.phase.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {r.phase.pct}%
                  </span>
                </button>
              ) : (
                <DeliverableNameCell
                  key={r.item!.id}
                  item={r.item!}
                  phase={r.phase}
                  members={members}
                  busy={busy}
                  onPatch={onPatch}
                  onDependency={onDependency}
                  allTasks={allTasks}
                  isCritical={critical.has(r.item!.id)}
                  rowH={ROW_H}
                />
              )
            )}
          </div>

          {/* -------- timeline (min-w-0 so the flex item can shrink and scroll
               internally instead of widening the page) -------- */}
          <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto">
            <div style={{ width: totalWidth }}>
              {/* headers */}
              <div className="flex h-[26px] border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {months.map((m, i) => (
                  <div
                    key={`${m.label}-${i}`}
                    className="flex items-center border-r px-2"
                    style={{ width: m.weeks * weekPx }}
                  >
                    <span className="truncate">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex h-[26px] border-b text-[9px] text-muted-foreground">
                {Array.from({ length: range.weeks }).map((_, i) => (
                  <div key={i} className="flex items-center border-r px-1" style={{ width: weekPx }}>
                    {weekPx >= 34 ? <span className="truncate tabular-nums">{fmt(addDays(range.from, i * 7))}</span> : null}
                  </div>
                ))}
              </div>

              {/* body */}
              <div className="relative">
                {/* week gridlines */}
                <div aria-hidden className="pointer-events-none absolute inset-0 flex">
                  {Array.from({ length: range.weeks }).map((_, i) => (
                    <div key={i} className="h-full border-r border-border/40" style={{ width: weekPx }} />
                  ))}
                </div>
                {/* today line */}
                {todayX >= 0 && todayX <= totalWidth && (
                  <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10" style={{ left: todayX }}>
                    <div className="h-full w-px bg-primary" />
                    <span className="absolute -left-[14px] top-0.5 rounded bg-primary px-1 text-[8px] font-bold uppercase text-primary-foreground">
                      Now
                    </span>
                  </div>
                )}

                {/* dependency connectors (finish → start) */}
                {connectors.length > 0 && (
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-0 z-[6]"
                    width={totalWidth}
                    height={rows.length * ROW_H}
                  >
                    <defs>
                      <marker id="depArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
                      </marker>
                    </defs>
                    {connectors.map((c, idx) => {
                      const elbow = 8;
                      const d =
                        c.x2 >= c.x1 + elbow * 2
                          ? `M ${c.x1} ${c.y1} H ${c.x1 + elbow} V ${c.y2} H ${c.x2 - 2}`
                          : `M ${c.x1} ${c.y1} H ${c.x1 + elbow} V ${c.y2 - ROW_H / 2} H ${c.x2 - elbow} V ${c.y2} H ${c.x2 - 2}`;
                      return (
                        <path
                          key={idx}
                          d={d}
                          fill="none"
                          markerEnd="url(#depArrow)"
                          className={cn(
                            showCritical && c.onCritical
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                          stroke="currentColor"
                          strokeWidth={showCritical && c.onCritical ? 1.8 : 1.2}
                          opacity={showCritical ? (c.onCritical ? 0.95 : 0.18) : 0.5}
                        />
                      );
                    })}
                  </svg>
                )}

                {rows.map((r) => {
                  if (r.kind === "phase") {
                    const p = r.phase;
                    const pBase = showBaseline && baseline ? baseline.phases[p.id] : undefined;
                    return (
                      <div key={p.id} className="relative border-b bg-muted/20" style={{ height: ROW_H }}>
                        {pBase && (
                          <div
                            aria-hidden
                            className="absolute h-[3px] rounded-full bg-muted-foreground/40"
                            style={{
                              left: x(new Date(pBase.start)),
                              width: w(new Date(pBase.start), new Date(pBase.end)),
                              top: "calc(50% + 13px)",
                            }}
                            title={`Baseline: ${fmtFull(new Date(pBase.start))} → ${fmtFull(new Date(pBase.end))}`}
                          />
                        )}
                        <div
                          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md"
                          style={{ left: x(p.start), width: w(p.start, p.end), backgroundColor: `${p.color}30` }}
                          title={`${p.name} · ${fmtFull(p.start)} → ${fmtFull(p.end)} · ${p.pct}%`}
                        >
                          <div
                            className="h-full rounded-md transition-[width] duration-500"
                            style={{ width: `${p.pct}%`, backgroundColor: p.color, opacity: 0.85 }}
                          />
                          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-foreground/80">
                            {w(p.start, p.end) > 90 ? `${p.durationWeeks}wk` : ""}
                          </span>
                        </div>
                        {/* milestone diamond at phase end */}
                        <div
                          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border"
                          style={{
                            left: x(p.end) - 5,
                            backgroundColor: p.status === "COMPLETED" ? p.color : "hsl(var(--background))",
                            borderColor: p.color,
                          }}
                          title={`${p.name} complete — ${fmtFull(p.end)}`}
                        />
                      </div>
                    );
                  }
                  const i = r.item!;
                  const overdue = i.status !== "DONE" && i.end < today;
                  const pct = taskProgress(i);
                  const isCritical = critical.has(i.id);
                  const base = showBaseline && baseline ? baseline.tasks[i.id] : undefined;
                  const baseStart = base ? new Date(base.start) : null;
                  const baseEnd = base ? new Date(base.end) : null;
                  const slip = baseEnd ? Math.round((i.end.getTime() - baseEnd.getTime()) / DAY) : 0;
                  const isDragging = drag?.id === i.id;
                  const dLeft = isDragging && drag!.mode === "move" ? drag!.dxDays * pxPerDay : 0;
                  const dWidth = isDragging && drag!.mode === "end" ? drag!.dxDays * pxPerDay : 0;
                  return (
                    <div key={i.id} className="relative border-b" style={{ height: ROW_H }}>
                      {/* baseline ghost (planned) */}
                      {baseStart && baseEnd && (
                        <div
                          aria-hidden
                          className="absolute h-[3px] rounded-full bg-muted-foreground/40"
                          style={{ left: x(baseStart), width: w(baseStart, baseEnd), top: "calc(50% + 11px)" }}
                          title={`Baseline: ${fmtFull(baseStart)} → ${fmtFull(baseEnd)}`}
                        />
                      )}
                      <div
                        onPointerDown={(e) => barPointerDown(e, i)}
                        onPointerMove={barPointerMove}
                        onPointerUp={() => barPointerUp(i)}
                        onPointerCancel={() => updateDrag(null)}
                        className={cn(
                          "absolute top-1/2 flex h-4 -translate-y-1/2 touch-none select-none items-center overflow-hidden rounded-full pr-1 transition-all",
                          isDragging ? "cursor-grabbing ring-2 ring-primary/60" : "cursor-grab",
                          overdue && "ring-1 ring-destructive/70",
                          showCritical && isCritical && "ring-2 ring-destructive",
                          showCritical && !isCritical && "opacity-35"
                        )}
                        style={{
                          left: x(i.start) + dLeft,
                          width: Math.max(10, w(i.start, i.end) + dWidth),
                          backgroundColor:
                            i.status === "DONE" ? `${r.phase.color}CC` : `${r.phase.color}2E`,
                          transition: isDragging ? "none" : undefined,
                        }}
                        title={`${i.name} · ${fmtFull(i.start)} → ${fmtFull(i.end)} · ${pct}%${i.estimateHours != null ? ` · est ${i.estimateHours}h` : ""}${i.actualHours != null ? ` · actual ${i.actualHours}h` : ""}${i.ownerName ? ` · ${i.ownerName}` : ""}${isCritical ? " · CRITICAL PATH" : ""}${overdue ? " · OVERDUE" : ""}${baseEnd ? (slip > 0 ? ` · ${slip}d behind baseline` : slip < 0 ? ` · ${-slip}d ahead of baseline` : " · on baseline") : ""} — drag to move, drag right edge to resize`}
                      >
                        {/* % complete fill */}
                        {i.status !== "DONE" && pct > 0 && (
                          <div
                            aria-hidden
                            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                            style={{ width: `${pct}%`, backgroundColor: `${r.phase.color}99` }}
                          />
                        )}
                        {w(i.start, i.end) > 64 && i.status !== "DONE" && pct > 0 && (
                          <span className="relative z-[1] ml-1.5 text-[8px] font-bold tabular-nums text-foreground/70">
                            {pct}%
                          </span>
                        )}
                        {i.ownerName && w(i.start, i.end) > 46 && (
                          <span className="relative z-[1] ml-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background text-[7px] font-bold text-foreground/80">
                            {initials(i.ownerName)}
                          </span>
                        )}
                        {/* resize grip (drag right edge) */}
                        <span
                          aria-hidden
                          className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-full bg-foreground/10"
                        />
                      </div>
                      {overdue && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[9px] font-semibold text-destructive"
                          style={{ left: x(i.end) + 6 }}
                        >
                          overdue
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Schedule derives from the configured phase durations (project start → back-to-back phases). Set explicit
        dates on any phase or deliverable to override; clearing them returns to the derived schedule. Link
        predecessors on a task to enforce finish-to-start sequencing — successors auto-shift when a predecessor
        moves, and <span className="font-medium text-foreground">Critical path</span> highlights the longest chain.
        Drag a bar to move it, drag its right edge to resize; the grey line under a bar is the{" "}
        <span className="font-medium text-foreground">baseline</span> (planned vs actual).
      </p>
    </div>
  );
}

/* --------------------- deliverable name cell + editor ------------------ */

function DeliverableNameCell({
  item,
  phase,
  members,
  busy,
  onPatch,
  onDependency,
  allTasks,
  isCritical,
  rowH,
}: {
  item: ScheduledDeliverable;
  phase: ScheduledPhase;
  members: { id: string; name: string | null }[];
  busy: Set<string>;
  onPatch: (body: Record<string, unknown>, busyKey: string) => Promise<boolean>;
  onDependency?: (
    action: "add" | "remove",
    predecessorId: string,
    successorId: string
  ) => Promise<boolean>;
  allTasks: { id: string; name: string; phaseName: string }[];
  isCritical: boolean;
  rowH: number;
}) {
  const prio = PRIORITY_META[item.priority ?? "MEDIUM"] ?? PRIORITY_META.MEDIUM;
  const isBusy = busy.has(item.id) || busy.has(`dep-${item.id}`);
  const NONE = "__none__";
  const ADD = "__add__";

  const pct = taskProgress(item);
  const [pctDraft, setPctDraft] = React.useState(String(pct));
  const [estDraft, setEstDraft] = React.useState(item.estimateHours != null ? String(item.estimateHours) : "");
  const [actDraft, setActDraft] = React.useState(item.actualHours != null ? String(item.actualHours) : "");
  React.useEffect(() => setPctDraft(String(pct)), [pct]);
  React.useEffect(
    () => setEstDraft(item.estimateHours != null ? String(item.estimateHours) : ""),
    [item.estimateHours]
  );
  React.useEffect(
    () => setActDraft(item.actualHours != null ? String(item.actualHours) : ""),
    [item.actualHours]
  );

  const patchDel = (data: Record<string, unknown>) =>
    void onPatch({ deliverable: { id: item.id, ...data } }, item.id);

  const commitPct = () => {
    const n = Math.max(0, Math.min(100, Math.round(Number(pctDraft))));
    if (!Number.isFinite(n)) return setPctDraft(String(pct));
    if (n !== pct) patchDel({ progressPct: n });
  };
  const commitHours = (key: "estimateHours" | "actualHours", raw: string, current: number | null | undefined) => {
    if (raw.trim() === "") {
      if (current != null) patchDel({ [key]: null });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if (n !== current) patchDel({ [key]: n });
  };

  const predIds = item.predecessorIds ?? [];
  const predOptions = allTasks.filter((t) => t.id !== item.id && !predIds.includes(t.id));
  const taskName = (tid: string) => allTasks.find((t) => t.id === tid)?.name ?? "task";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 border-b px-2 pl-7 text-left hover:bg-muted/40"
          style={{ height: rowH }}
        >
          {(item.priority === "HIGH" || item.priority === "CRITICAL") && (
            <Flag className={cn("h-3 w-3 shrink-0", prio.className)} />
          )}
          <span className={cn("truncate text-sm", item.status === "DONE" && "text-muted-foreground line-through")}>
            {item.name}
          </span>
          {isBusy ? (
            <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {fmt(item.start)}–{fmt(item.end)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-3" align="start" side="right">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{item.name}</span>
            {isCritical && (
              <Badge variant="outline" className="border-destructive/50 text-[9px] text-destructive">
                Critical path
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {phase.name} · {fmtFull(item.start)} → {fmtFull(item.end)}
          </div>
        </div>

        {/* % complete */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">% complete</Label>
            <span className="text-[11px] font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={pctDraft}
              onChange={(e) => setPctDraft(e.target.value)}
              onBlur={commitPct}
              onKeyDown={(e) => e.key === "Enter" && commitPct()}
              className="h-8 w-16 text-xs tabular-nums"
            />
            {[25, 50, 75, 100].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => patchDel({ progressPct: q })}
                className={cn(
                  "flex-1 rounded-md border px-1 py-1 text-[10px] tabular-nums transition-colors hover:bg-muted",
                  pct === q && "border-primary/50 bg-primary/10 text-primary"
                )}
              >
                {q}%
              </button>
            ))}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* effort */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Est. hours</Label>
            <Input
              type="number"
              min={0}
              placeholder="—"
              value={estDraft}
              onChange={(e) => setEstDraft(e.target.value)}
              onBlur={() => commitHours("estimateHours", estDraft, item.estimateHours)}
              className="mt-1 h-8 text-xs tabular-nums"
            />
          </div>
          <div>
            <Label className="text-xs">Actual hours</Label>
            <Input
              type="number"
              min={0}
              placeholder="—"
              value={actDraft}
              onChange={(e) => setActDraft(e.target.value)}
              onBlur={() => commitHours("actualHours", actDraft, item.actualHours)}
              className="mt-1 h-8 text-xs tabular-nums"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={item.status} onValueChange={(v) => patchDel({ status: v })}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={item.priority ?? "MEDIUM"} onValueChange={(v) => patchDel({ priority: v })}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Assignee</Label>
          <Select
            value={item.ownerId ?? NONE}
            onValueChange={(v) => patchDel({ ownerId: v === NONE ? null : v })}
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name ?? m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Start</Label>
            <div className="mt-1">
              <DatePicker
                value={toDateInput(item.startDate ? new Date(item.startDate) : null)}
                onChange={(v) => patchDel({ startDate: v || null })}
                placeholder="Derived"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <div className="mt-1">
              <DatePicker
                value={toDateInput(item.endDate ? new Date(item.endDate) : null)}
                onChange={(v) => patchDel({ endDate: v || null })}
                placeholder="Derived"
              />
            </div>
          </div>
        </div>
        {/* predecessors (finish-to-start) */}
        {onDependency && (
          <div>
            <Label className="flex items-center gap-1 text-xs">
              <GitBranch className="h-3 w-3" /> Predecessors (finish → start)
            </Label>
            {predIds.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {predIds.map((pid) => (
                  <li
                    key={pid}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                  >
                    <span className="truncate">{taskName(pid)}</span>
                    <button
                      type="button"
                      onClick={() => void onDependency("remove", pid, item.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-destructive"
                      aria-label={`Remove dependency on ${taskName(pid)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Select
              value={ADD}
              onValueChange={(v) => {
                if (v !== ADD) void onDependency("add", v, item.id);
              }}
            >
              <SelectTrigger className="mt-1.5 h-8 text-xs">
                <SelectValue placeholder="Add predecessor…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value={ADD} className="text-muted-foreground">
                  Add predecessor…
                </SelectItem>
                {predOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.phaseName} · {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              This task can only start after every predecessor ends — dates auto-shift to comply.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Blank dates follow the phase window.</span>
          {item.ownerName && <Badge variant="soft" className="text-[10px]">{item.ownerName}</Badge>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
