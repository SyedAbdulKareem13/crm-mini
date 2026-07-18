"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Flag,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export type ScheduledDeliverable = PlannerDeliverable & { start: Date; end: Date };
export type ScheduledPhase = PlannerPhase & {
  start: Date;
  end: Date;
  items: ScheduledDeliverable[];
  pct: number;
};

/**
 * Derive the schedule from configuration: phases run back-to-back from the
 * project start date using their configured durations; explicit start/end
 * dates on a phase or deliverable override the derived window.
 */
export function computeSchedule(project: PlannerProject): ScheduledPhase[] {
  const anchor = startOfDay(project.startDate ? new Date(project.startDate) : new Date());
  let cursor = anchor;
  return project.phases.map((phase) => {
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
    const done = items.filter((i) => i.status === "DONE").length;
    return {
      ...phase,
      start,
      end: end <= start ? addDays(start, 7) : end,
      items,
      pct: items.length ? Math.round((done / items.length) * 100) : phase.status === "COMPLETED" ? 100 : 0,
    };
  });
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

export function ProjectGantt({
  project,
  members,
  busy,
  onPatch,
}: {
  project: PlannerProject;
  members: { id: string; name: string | null }[];
  busy: Set<string>;
  onPatch: (body: Record<string, unknown>, busyKey: string) => Promise<boolean>;
}) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [weekPx, setWeekPx] = React.useState(44);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const phases = React.useMemo(() => computeSchedule(project), [project]);
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
    const rows: string[][] = [
      ["Type", "Phase", "Item", "Status", "Priority", "Assignee", "Start", "End", "Duration (days)"],
    ];
    for (const p of phases) {
      rows.push([
        "Phase", p.name, "", p.status, "", "",
        fmtFull(p.start), fmtFull(p.end),
        String(Math.round((p.end.getTime() - p.start.getTime()) / DAY)),
      ]);
      for (const i of p.items) {
        rows.push([
          "Deliverable", p.name, i.name, i.status, i.priority ?? "MEDIUM", i.ownerName ?? "",
          fmtFull(i.start), fmtFull(i.end),
          String(Math.round((i.end.getTime() - i.start.getTime()) / DAY)),
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
          <Button variant="outline" size="sm" className="h-8" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <div className="flex">
          {/* -------- fixed name column -------- */}
          <div className="w-[270px] shrink-0 border-r bg-card/60">
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
                  rowH={ROW_H}
                />
              )
            )}
          </div>

          {/* -------- timeline -------- */}
          <div ref={scrollRef} className="relative flex-1 overflow-x-auto">
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

                {rows.map((r) => {
                  if (r.kind === "phase") {
                    const p = r.phase;
                    return (
                      <div key={p.id} className="relative border-b bg-muted/20" style={{ height: ROW_H }}>
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
                  return (
                    <div key={i.id} className="relative border-b" style={{ height: ROW_H }}>
                      <div
                        className={cn(
                          "absolute top-1/2 flex h-4 -translate-y-1/2 items-center rounded-full pr-1 transition-shadow",
                          overdue && "ring-1 ring-destructive/70"
                        )}
                        style={{
                          left: x(i.start),
                          width: w(i.start, i.end),
                          backgroundColor:
                            i.status === "DONE"
                              ? `${r.phase.color}CC`
                              : i.status === "IN_PROGRESS"
                                ? `${r.phase.color}66`
                                : "hsl(var(--muted))",
                        }}
                        title={`${i.name} · ${fmtFull(i.start)} → ${fmtFull(i.end)}${i.ownerName ? ` · ${i.ownerName}` : ""}${overdue ? " · OVERDUE" : ""}`}
                      >
                        {i.ownerName && w(i.start, i.end) > 46 && (
                          <span className="ml-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background text-[7px] font-bold text-foreground/80">
                            {initials(i.ownerName)}
                          </span>
                        )}
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
        dates on any phase or deliverable to override; clearing them returns to the derived schedule.
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
  rowH,
}: {
  item: ScheduledDeliverable;
  phase: ScheduledPhase;
  members: { id: string; name: string | null }[];
  busy: Set<string>;
  onPatch: (body: Record<string, unknown>, busyKey: string) => Promise<boolean>;
  rowH: number;
}) {
  const prio = PRIORITY_META[item.priority ?? "MEDIUM"] ?? PRIORITY_META.MEDIUM;
  const isBusy = busy.has(item.id);
  const NONE = "__none__";

  const patchDel = (data: Record<string, unknown>) =>
    void onPatch({ deliverable: { id: item.id, ...data } }, item.id);

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
      <PopoverContent className="w-72 space-y-3 p-3" align="start" side="right">
        <div>
          <div className="text-sm font-semibold">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            {phase.name} · {fmtFull(item.start)} → {fmtFull(item.end)}
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
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Blank dates follow the phase window.</span>
          {item.ownerName && <Badge variant="soft" className="text-[10px]">{item.ownerName}</Badge>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
