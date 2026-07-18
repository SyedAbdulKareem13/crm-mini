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
import { ProjectGantt } from "./project-gantt";

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
}: {
  project: PlannerProject;
  members?: { id: string; name: string | null }[];
}) {
  const router = useRouter();
  const [project, setProject] = React.useState(initial);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [savingCore, setSavingCore] = React.useState(false);
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState(initial.notes ?? "");
  const [view, setView] = React.useState<"roadmap" | "gantt">("roadmap");

  const [newTask, setNewTask] = React.useState<Record<string, string>>({});

  const totalWeeks = project.phases.reduce((n, p) => n + p.durationWeeks, 0);
  const allDeliverables = project.phases.flatMap((p) => p.deliverables);
  const health = computeProjectHealth(project.status, project.startDate, project.phases);
  const healthMeta = HEALTH_META[health];
  const doneCount = allDeliverables.filter((d) => d.status === "DONE").length;
  const overallPct = allDeliverables.length
    ? Math.round((doneCount / allDeliverables.length) * 100)
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
        // Normalize the API shape (owner relation → ownerName) for both views.
        const phases = (data.project.phases as any[]).map((ph) => ({
          ...ph,
          deliverables: (ph.deliverables as any[]).map((del) => ({
            ...del,
            ownerName: del.owner?.name ?? null,
          })),
        })) as PlannerPhase[];
        setProject((prev) => ({ ...prev, phases }));
      }
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

  async function addTask(phase: PlannerPhase) {
    const name = (newTask[phase.id] ?? "").trim();
    if (!name) return toast.error("Give the task a name");
    if (busy.has(`add-${phase.id}`)) return;
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
      };
      setProject((p) => ({
        ...p,
        phases: p.phases.map((ph) =>
          ph.id === phase.id ? { ...ph, deliverables: [...ph.deliverables, del] } : ph
        ),
      }));
      setNewTask((prev) => ({ ...prev, [phase.id]: "" }));
      toast.success(`Added “${name}”`);
    } catch (err: any) {
      toast.error(err?.message || "Could not add task");
    } finally {
      mark(`add-${phase.id}`, false);
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
            <ProjectGantt project={project} members={members} busy={busy} onPatch={patch} />
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
