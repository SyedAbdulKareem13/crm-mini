"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  Target,
  Building2,
  CalendarRange,
  Loader2,
  Pencil,
  Check,
  Plus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { computeProjectHealth, HEALTH_META } from "@/lib/project-health";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectGantt, type BaselineData } from "./project-gantt";
import { ProjectEstimator, type SavedEstimate } from "./project-estimator";
import { ResourceOptimizer } from "./resource-optimizer";
import { joinProjectChannel, type PresencePeer } from "@/lib/realtime";

/* ------------------------------- types -------------------------------- */

export type PlannerDeliverable = {
  id: string;
  name: string;
  position: number;
  status: string;
  priority?: string;
  ownerId?: string | null;
  ownerName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progressPct?: number;
  estimateHours?: number | null;
  actualHours?: number | null;
  predecessorIds?: string[];
};
export type PlannerPhase = {
  id: string;
  name: string;
  color: string;
  durationWeeks: number;
  position: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  deliverables: PlannerDeliverable[];
};
export type PlannerProject = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  startDate: string | null;
  targetEndDate: string | null;
  notes: string | null;
  customer: { id: string; name: string } | null;
  opportunity: { id: string; name: string; oppNumber: string; stage: string } | null;
  methodologyName: string | null;
  transformationType: { name: string; subtitle: string | null } | null;
  ownerName: string | null;
  phases: PlannerPhase[];
};

const PROJECT_STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const NEXT_DELIVERABLE_STATUS: Record<string, string> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

/* ------------------------------ component ----------------------------- */

export function ProjectPlanner({
  project: initial,
  members = [],
  estimate = null,
  baseline: initialBaseline = null,
  viewer,
}: {
  project: PlannerProject;
  members?: { id: string; name: string | null }[];
  estimate?: SavedEstimate;
  baseline?: BaselineData | null;
  viewer?: { id: string; name: string };
}) {
  const router = useRouter();
  const [project, setProject] = React.useState(initial);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [savingCore, setSavingCore] = React.useState(false);
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState(initial.notes ?? "");
  const [view, setView] = React.useState<"roadmap" | "gantt" | "estimator" | "resources">("roadmap");
  const [savedEstimate, setSavedEstimate] = React.useState<SavedEstimate>(estimate);
  const [baseline, setBaseline] = React.useState<BaselineData | null>(initialBaseline);
  const [peers, setPeers] = React.useState<PresencePeer[]>([]);
  const notifyRef = React.useRef<() => void>(() => {});

  /* ------------------- realtime sync + presence ------------------- */

  // Pull a fresh copy after a peer's edit (also used as a focus fallback).
  const refetching = React.useRef(false);
  const refetch = React.useCallback(async () => {
    if (refetching.current) return;
    refetching.current = true;
    try {
      const res = await fetch(`/api/projects/${initial.id}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.project?.phases) {
        const phases = (data.project.phases as any[]).map((ph) => ({
          ...ph,
          deliverables: (ph.deliverables as any[]).map((del) => ({
            ...del,
            ownerName: del.owner?.name ?? null,
            predecessorIds:
              (del.predecessors as any[] | undefined)?.map((p) => p.predecessorId) ?? [],
          })),
        })) as PlannerPhase[];
        setProject((prev) => ({
          ...prev,
          name: data.project.name ?? prev.name,
          status: data.project.status ?? prev.status,
          startDate: data.project.startDate ?? prev.startDate,
          targetEndDate: data.project.targetEndDate ?? prev.targetEndDate,
          notes: data.project.notes ?? prev.notes,
          phases,
        }));
        router.refresh(); // keep the audit/activity feed live too
      }
    } finally {
      refetching.current = false;
    }
  }, [initial.id, router]);

  React.useEffect(() => {
    if (!viewer) return;
    const channel = joinProjectChannel({
      projectId: initial.id,
      user: viewer,
      onPeers: setPeers,
      onRemoteChange: () => void refetch(),
    });
    notifyRef.current = channel.notify;
    // Fallback for single-user / unconfigured realtime: refresh when the tab
    // regains focus so stale views recover either way.
    const onFocus = () => void refetch();
    if (!channel.enabled) window.addEventListener("focus", onFocus);
    return () => {
      channel.leave();
      notifyRef.current = () => {};
      if (!channel.enabled) window.removeEventListener("focus", onFocus);
    };
  }, [initial.id, viewer, refetch]);

  /** Tell peers something changed (called after every successful mutation). */
  const broadcast = () => notifyRef.current();

  const [newTask, setNewTask] = React.useState<Record<string, string>>({});

  const totalWeeks = project.phases.reduce((n, p) => n + p.durationWeeks, 0);
  const allDeliverables = project.phases.flatMap((p) => p.deliverables);
  const health = computeProjectHealth(project.status, project.startDate, project.phases);
  const healthMeta = HEALTH_META[health];
  const doneCount = allDeliverables.filter((d) => d.status === "DONE").length;
  // Overall completion is the average task % complete (DONE = 100 even when
  // rows predate the progress column).
  const overallPct = allDeliverables.length
    ? Math.round(
        allDeliverables.reduce(
          (n, d) => n + (d.status === "DONE" ? 100 : d.progressPct ?? 0),
          0
        ) / allDeliverables.length
      )
    : 0;

  const mark = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function patch(body: Record<string, unknown>, busyKey: string): Promise<boolean> {
    mark(busyKey, true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Update failed");
      if (data?.project?.phases) {
        // Normalize the API shape (owner relation → ownerName, predecessor
        // rows → id array) for all views.
        const phases = (data.project.phases as any[]).map((ph) => ({
          ...ph,
          deliverables: (ph.deliverables as any[]).map((del) => ({
            ...del,
            ownerName: del.owner?.name ?? null,
            predecessorIds: (del.predecessors as any[] | undefined)?.map((p) => p.predecessorId) ?? [],
          })),
        })) as PlannerPhase[];
        setProject((prev) => ({ ...prev, phases }));
      }
      if (Array.isArray(data?.shifted) && data.shifted.length > 0) {
        toast.info(
          `${data.shifted.length} dependent task${data.shifted.length === 1 ? "" : "s"} auto-shifted to respect dependencies`
        );
      }
      broadcast();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
      return false;
    } finally {
      mark(busyKey, false);
    }
  }

  async function setStatus(status: string) {
    const prev = project.status;
    setProject((p) => ({ ...p, status }));
    setSavingCore(true);
    const ok = await patch({ status }, `status`);
    setSavingCore(false);
    if (!ok) setProject((p) => ({ ...p, status: prev }));
    else {
      toast.success(`Project ${PROJECT_STATUSES.find((s) => s.value === status)?.label.toLowerCase() ?? status}`);
      router.refresh();
    }
  }

  async function setDate(key: "startDate" | "targetEndDate", value: string) {
    const prev = project[key];
    const iso = value ? new Date(value + "T00:00:00").toISOString() : null;
    setProject((p) => ({ ...p, [key]: iso }));
    const ok = await patch({ [key]: value || null }, key);
    if (!ok) setProject((p) => ({ ...p, [key]: prev }));
  }

  async function saveNotes() {
    const ok = await patch({ notes: notesDraft.trim() || null }, "notes");
    if (ok) {
      setProject((p) => ({ ...p, notes: notesDraft.trim() || null }));
      setEditingNotes(false);
      toast.success("Notes saved");
    }
  }

  async function cycleDeliverable(phase: PlannerPhase, del: PlannerDeliverable) {
    if (busy.has(del.id)) return;
    const nextStatus = NEXT_DELIVERABLE_STATUS[del.status] ?? "IN_PROGRESS";
    // optimistic
    setProject((p) => ({
      ...p,
      phases: p.phases.map((ph) =>
        ph.id !== phase.id
          ? ph
          : { ...ph, deliverables: ph.deliverables.map((d) => (d.id === del.id ? { ...d, status: nextStatus } : d)) }
      ),
    }));
    await patch({ deliverable: { id: del.id, status: nextStatus } }, del.id);
  }

  async function setPhaseStatus(phase: PlannerPhase, status: string) {
    if (busy.has(phase.id)) return;
    await patch({ phase: { id: phase.id, status } }, phase.id);
  }

  /** Shared task creation — used by the roadmap "Add task" input and the
   *  Resources view's deliverable library. */
  async function createTask(phase: PlannerPhase, name: string): Promise<boolean> {
    if (busy.has(`add-${phase.id}`)) return false;
    mark(`add-${phase.id}`, true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: phase.id, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not add task");
      const del: PlannerDeliverable = {
        ...data.deliverable,
        ownerName: data.deliverable?.owner?.name ?? null,
        predecessorIds:
          (data.deliverable?.predecessors as any[] | undefined)?.map((p) => p.predecessorId) ?? [],
      };
      setProject((p) => ({
        ...p,
        phases: p.phases.map((ph) =>
          ph.id === phase.id ? { ...ph, deliverables: [...ph.deliverables, del] } : ph
        ),
      }));
      broadcast();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Could not add task");
      return false;
    } finally {
      mark(`add-${phase.id}`, false);
    }
  }

  async function addTask(phase: PlannerPhase) {
    const name = (newTask[phase.id] ?? "").trim();
    if (!name) return toast.error("Give the task a name");
    const ok = await createTask(phase, name);
    if (ok) {
      setNewTask((prev) => ({ ...prev, [phase.id]: "" }));
      toast.success(`Added “${name}”`);
    }
  }

  /** Add/remove a finish-to-start link; applies auto-shifted dates locally. */
  async function mutateDependency(
    action: "add" | "remove",
    predecessorId: string,
    successorId: string
  ): Promise<boolean> {
    const key = `dep-${successorId}`;
    if (busy.has(key)) return false;
    mark(key, true);
    try {
      const res =
        action === "add"
          ? await fetch(`/api/projects/${project.id}/dependencies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ predecessorId, successorId }),
            })
          : await fetch(
              `/api/projects/${project.id}/dependencies?predecessorId=${predecessorId}&successorId=${successorId}`,
              { method: "DELETE" }
            );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Dependency update failed");
      const shifted = (data?.shifted ?? []) as { id: string; startDate: string; endDate: string }[];
      setProject((p) => ({
        ...p,
        phases: p.phases.map((ph) => ({
          ...ph,
          deliverables: ph.deliverables.map((d) => {
            let next = d;
            if (d.id === successorId) {
              const ids = new Set(d.predecessorIds ?? []);
              if (action === "add") ids.add(predecessorId);
              else ids.delete(predecessorId);
              next = { ...next, predecessorIds: [...ids] };
            }
            const sh = shifted.find((s) => s.id === next.id);
            if (sh) next = { ...next, startDate: sh.startDate, endDate: sh.endDate };
            return next;
          }),
        })),
      }));
      if (shifted.length > 0) {
        toast.info(`${shifted.length} task${shifted.length === 1 ? "" : "s"} auto-shifted to respect dependencies`);
      }
      broadcast();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Dependency update failed");
      return false;
    } finally {
      mark(key, false);
    }
  }

  /** Snapshot or clear the schedule baseline (Gantt planned-vs-actual). */
  async function mutateBaseline(action: "set" | "clear"): Promise<boolean> {
    if (busy.has("baseline")) return false;
    mark("baseline", true);
    try {
      const res = await fetch(`/api/projects/${project.id}/baseline`, {
        method: action === "set" ? "POST" : "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Baseline update failed");
      setBaseline(action === "set" ? (data.baseline as BaselineData) : null);
      toast.success(action === "set" ? "Baseline saved — planned vs actual is now tracked" : "Baseline cleared");
      broadcast();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Baseline update failed");
      return false;
    } finally {
      mark("baseline", false);
    }
  }

  async function removeTask(phase: PlannerPhase, del: PlannerDeliverable) {
    if (busy.has(del.id)) return;
    const prevPhases = project.phases;
    setProject((p) => ({
      ...p,
      phases: p.phases.map((ph) =>
        ph.id === phase.id
          ? { ...ph, deliverables: ph.deliverables.filter((d) => d.id !== del.id) }
          : ph
      ),
    }));
    mark(del.id, true);
    try {
      const res = await fetch(`/api/projects/${project.id}?deliverableId=${del.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      toast.success(`Removed “${del.name}”`);
      broadcast();
    } catch (err: any) {
      setProject((p) => ({ ...p, phases: prevPhases }));
      toast.error(err?.message || "Delete failed");
    } finally {
      mark(del.id, false);
    }
  }

  const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="space-y-6">
      {/* ------------------------- Header card ------------------------- */}
      <Card className="luxury-card overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{project.name}</CardTitle>
              <Badge variant="soft">{project.projectNumber}</Badge>
              <Badge
                variant={healthMeta.tone === "success" ? "success" : healthMeta.tone === "warning" ? "warning" : "outline"}
                className={cn(healthMeta.tone === "destructive" && "border-destructive/50 text-destructive")}
              >
                {healthMeta.label}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {project.transformationType && (
                <Badge variant="outline" className="font-normal">
                  {project.transformationType.name}
                  {project.transformationType.subtitle ? ` · ${project.transformationType.subtitle}` : ""}
                </Badge>
              )}
              {project.methodologyName && (
                <Badge variant="soft" className="font-normal">{project.methodologyName}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* presence — everyone viewing this project right now */}
            {peers.length > 0 && (
              <div className="mr-1 flex items-center -space-x-1.5" title={`Viewing now: ${peers.map((p) => p.name).join(", ")}`}>
                {peers.slice(0, 4).map((p) => (
                  <span
                    key={p.key}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-[9px] font-bold text-primary"
                  >
                    {(p.name || "?")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("")}
                  </span>
                ))}
                {peers.length > 4 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground">
                    +{peers.length - 4}
                  </span>
                )}
                <span className="relative ml-2.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            )}
            {savingCore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Select value={project.status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Customer</Label>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {project.customer?.name ?? "—"}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Opportunity</Label>
            <div className="mt-1 text-sm font-medium">
              {project.opportunity ? (
                <Link
                  href={`/app/opportunities/${project.opportunity.id}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Target className="h-3.5 w-3.5" />
                  {project.opportunity.oppNumber}
                </Link>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Start date</Label>
            <div className="mt-1">
              <DatePicker
                value={dateInput(project.startDate)}
                onChange={(v) => void setDate("startDate", v)}
                placeholder="Set start date"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Target end</Label>
            <div className="mt-1">
              <DatePicker
                value={dateInput(project.targetEndDate)}
                onChange={(v) => void setDate("targetEndDate", v)}
                placeholder="Set target end"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------- Roadmap timeline ---------------------- */}
      <Card className="luxury-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Project Planner</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.methodologyName ?? "Roadmap"} · {totalWeeks} weeks planned ·{" "}
              {doneCount}/{allDeliverables.length} deliverables done
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* view switch */}
            <div className="flex rounded-xl border bg-background/60 p-0.5">
              {(
                [
                  { key: "roadmap", label: "Roadmap" },
                  { key: "gantt", label: "Gantt" },
                  { key: "estimator", label: "Estimator" },
                  { key: "resources", label: "Resources" },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  aria-pressed={view === v.key}
                  className={cn(
                    "rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors",
                    view === v.key
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-semibold tabular-nums">{overallPct}%</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">complete</div>
            </div>
          </div>
        </CardHeader>
        {view === "gantt" ? (
          <CardContent>
            <ProjectGantt
              project={project}
              members={members}
              busy={busy}
              onPatch={patch}
              onDependency={mutateDependency}
              baseline={baseline}
              onBaseline={mutateBaseline}
            />
          </CardContent>
        ) : view === "estimator" ? (
          <CardContent>
            <ProjectEstimator
              projectId={project.id}
              initial={savedEstimate}
              canQuote={!!project.customer}
              onSaved={setSavedEstimate}
            />
          </CardContent>
        ) : view === "resources" ? (
          <CardContent>
            <ResourceOptimizer
              estimate={savedEstimate}
              phases={project.phases}
              onAddToPhase={createTask}
            />
          </CardContent>
        ) : (
        <CardContent className="space-y-6">
          {/* Phase bar — widths proportional to duration (SAP Activate style) */}
          <div>
            <div className="flex w-full gap-1 overflow-hidden rounded-xl">
              {project.phases.map((p) => {
                const w = totalWeeks > 0 ? (p.durationWeeks / totalWeeks) * 100 : 100 / project.phases.length;
                const completed = p.status === "COMPLETED";
                const active = p.status === "IN_PROGRESS";
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative min-w-[64px] px-2 py-2.5 text-center transition-opacity",
                      completed ? "" : active ? "" : "opacity-45"
                    )}
                    style={{ width: `${w}%`, backgroundColor: `${p.color}22` }}
                    title={`${p.name} · ${p.durationWeeks}wk · ${p.status.toLowerCase().replace("_", " ")}`}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ backgroundColor: p.color, opacity: completed || active ? 1 : 0.35 }}
                    />
                    <div className="truncate text-xs font-semibold" style={{ color: p.color }}>
                      {p.name}
                    </div>
                    <div className="text-[10px] tabular-nums text-muted-foreground">{p.durationWeeks}wk</div>
                    {active && (
                      <span
                        className="absolute right-1.5 top-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    )}
                    {completed && (
                      <CheckCircle2
                        className="absolute right-1 top-1 h-3.5 w-3.5"
                        style={{ color: p.color }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
              Total planned duration: {totalWeeks} weeks (~{Math.max(1, Math.round(totalWeeks / 4.33))} months)
            </p>
          </div>

          {/* Phase cards with deliverables */}
          <div className="grid gap-4 lg:grid-cols-2">
            {project.phases.map((phase, i) => {
              const total = phase.deliverables.length;
              const done = phase.deliverables.filter((d) => d.status === "DONE").length;
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                  className="rounded-2xl border bg-card/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: phase.color }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{phase.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {phase.durationWeeks} weeks · {done}/{total} done
                        </div>
                      </div>
                    </div>
                    <Select
                      value={phase.status}
                      onValueChange={(v) => {
                        setProject((p) => ({
                          ...p,
                          phases: p.phases.map((ph) =>
                            ph.id === phase.id
                              ? {
                                  ...ph,
                                  status: v,
                                  deliverables:
                                    v === "COMPLETED"
                                      ? ph.deliverables.map((d) => ({ ...d, status: "DONE" }))
                                      : ph.deliverables,
                                }
                              : ph
                          ),
                        }));
                        void setPhaseStatus(phase, v);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOT_STARTED">Not started</SelectItem>
                        <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ul className="mt-3 space-y-1">
                    {phase.deliverables.map((del) => {
                      const isBusy = busy.has(del.id);
                      return (
                        <li key={del.id} className="group flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void cycleDeliverable(phase, del)}
                            disabled={isBusy}
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60",
                              del.status === "DONE" && "text-muted-foreground"
                            )}
                            title="Click to cycle: pending → in progress → done"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                            ) : del.status === "DONE" ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: phase.color }} />
                            ) : del.status === "IN_PROGRESS" ? (
                              <CircleDot className="h-4 w-4 shrink-0" style={{ color: phase.color }} />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            )}
                            <span className={cn("truncate", del.status === "DONE" && "line-through")}>
                              {del.name}
                            </span>
                            {del.status === "IN_PROGRESS" && (del.progressPct ?? 0) > 0 && (
                              <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                                {del.progressPct}%
                              </span>
                            )}
                            {del.ownerName && (
                              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                                {del.ownerName}
                              </span>
                            )}
                            {del.status === "IN_PROGRESS" && (
                              <Badge variant="soft" className={cn("shrink-0 text-[10px]", !del.ownerName && "ml-auto")}>
                                In progress
                              </Badge>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTask(phase, del)}
                            aria-label={`Remove ${del.name}`}
                            className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                    {phase.deliverables.length === 0 && (
                      <li className="px-2 py-1.5 text-xs text-muted-foreground">
                        No deliverables in this phase yet — add one below.
                      </li>
                    )}
                  </ul>

                  {/* Add a task/deliverable to this phase (project-level, not the template) */}
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="Add task…"
                      value={newTask[phase.id] ?? ""}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, [phase.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addTask(phase);
                        }
                      }}
                      className="h-8 flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={busy.has(`add-${phase.id}`)}
                      onClick={() => void addTask(phase)}
                    >
                      {busy.has(`add-${phase.id}`) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
        )}
      </Card>

      {/* ----------------------------- Notes ---------------------------- */}
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Notes</CardTitle>
          {!editingNotes ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNotesDraft(project.notes ?? "");
                setEditingNotes(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={() => void saveNotes()} disabled={busy.has("notes")}>
                {busy.has("notes") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={4} />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {project.notes ?? "No notes yet."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Roadmap phases and deliverables come from the methodology template — configure them in Admin → Configuration → SAP Projects.
      </div>
    </div>
  );
}
