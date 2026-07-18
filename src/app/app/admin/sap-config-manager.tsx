"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  ShieldCheck,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPP_STAGES } from "@/lib/constants";

/* ------------------------------- types -------------------------------- */

type Deliverable = { id: string; name: string; position: number; active: boolean };
type Phase = {
  id: string;
  name: string;
  color: string;
  durationWeeks: number;
  position: number;
  active: boolean;
  deliverables: Deliverable[];
};
type Methodology = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  phases: Phase[];
};
type TransformationType = {
  id: string;
  key: string;
  name: string;
  subtitle: string | null;
  active: boolean;
  methodology: { id: string; name: string } | null;
};
type Gates = {
  quoteRequiredStage: string | null;
  projectRequiredStage: string | null;
  sequentialPhases: boolean;
  completeRequiresAllPhases: boolean;
};

const GATE_STAGES = OPP_STAGES.filter((s) => s.value !== "LOST");
const OFF = "__off__";

/* ------------------------------ component ----------------------------- */

export function SapConfigManager() {
  const [loading, setLoading] = React.useState(true);
  const [methodologies, setMethodologies] = React.useState<Methodology[]>([]);
  const [types, setTypes] = React.useState<TransformationType[]>([]);
  const [gates, setGates] = React.useState<Gates>({
    quoteRequiredStage: null,
    projectRequiredStage: null,
    sequentialPhases: false,
    completeRequiresAllPhases: true,
  });
  const [openMeth, setOpenMeth] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [newDeliverable, setNewDeliverable] = React.useState<Record<string, string>>({});

  const mark = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sap-config");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMethodologies(data.methodologies ?? []);
      setTypes(data.transformationTypes ?? []);
      setGates({
        quoteRequiredStage: data.gates?.quoteRequiredStage ?? null,
        projectRequiredStage: data.gates?.projectRequiredStage ?? null,
        sequentialPhases: data.gates?.sequentialPhases ?? false,
        completeRequiresAllPhases: data.gates?.completeRequiresAllPhases ?? true,
      });
    } catch {
      toast.error("Could not load SAP project configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>, busyKey: string): Promise<boolean> {
    mark(busyKey, true);
    try {
      const res = await fetch("/api/admin/sap-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Update failed");
      }
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
      void load();
      return false;
    } finally {
      mark(busyKey, false);
    }
  }

  /* ------------------------------ gates ------------------------------ */

  async function setGate(key: "quoteRequiredStage" | "projectRequiredStage", value: string) {
    const v = value === OFF ? null : value;
    const prev = gates[key];
    setGates((g) => ({ ...g, [key]: v }));
    const ok = await patch({ gates: { [key]: v } }, `gate-${key}`);
    if (!ok) setGates((g) => ({ ...g, [key]: prev }));
    else toast.success("Gate updated");
  }

  async function setGovernance(key: "sequentialPhases" | "completeRequiresAllPhases", value: boolean) {
    const prev = gates[key];
    setGates((g) => ({ ...g, [key]: value }));
    const ok = await patch({ gates: { [key]: value } }, `gate-${key}`);
    if (!ok) setGates((g) => ({ ...g, [key]: prev }));
    else toast.success("Governance updated");
  }

  /* --------------------------- methodology --------------------------- */

  async function patchPhase(phase: Phase, data: Partial<Pick<Phase, "durationWeeks" | "active" | "name">>) {
    setMethodologies((prev) =>
      prev.map((m) => ({
        ...m,
        phases: m.phases.map((p) => (p.id === phase.id ? { ...p, ...data } : p)),
      }))
    );
    await patch({ phase: { id: phase.id, ...data } }, phase.id);
  }

  async function patchDeliverable(del: Deliverable, data: Partial<Pick<Deliverable, "name" | "active">>) {
    setMethodologies((prev) =>
      prev.map((m) => ({
        ...m,
        phases: m.phases.map((p) => ({
          ...p,
          deliverables: p.deliverables.map((d) => (d.id === del.id ? { ...d, ...data } : d)),
        })),
      }))
    );
    await patch({ deliverable: { id: del.id, ...data } }, del.id);
  }

  async function addDeliverable(phase: Phase) {
    const name = (newDeliverable[phase.id] ?? "").trim();
    if (!name) return toast.error("Give the deliverable a name");
    mark(`add-${phase.id}`, true);
    try {
      const res = await fetch("/api/admin/sap-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: phase.id, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setMethodologies((prev) =>
        prev.map((m) => ({
          ...m,
          phases: m.phases.map((p) =>
            p.id === phase.id ? { ...p, deliverables: [...p.deliverables, data.deliverable] } : p
          ),
        }))
      );
      setNewDeliverable((prev) => ({ ...prev, [phase.id]: "" }));
      toast.success(`Added “${name}”`);
    } catch (err: any) {
      toast.error(err?.message || "Could not add deliverable");
    } finally {
      mark(`add-${phase.id}`, false);
    }
  }

  async function removeDeliverable(del: Deliverable) {
    setMethodologies((prev) =>
      prev.map((m) => ({
        ...m,
        phases: m.phases.map((p) => ({
          ...p,
          deliverables: p.deliverables.filter((d) => d.id !== del.id),
        })),
      }))
    );
    mark(del.id, true);
    try {
      const res = await fetch(`/api/admin/sap-config?deliverableId=${del.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`Removed “${del.name}”`);
    } catch {
      toast.error("Delete failed — reverted");
      void load();
    } finally {
      mark(del.id, false);
    }
  }

  /* ---------------- template creation / deletion (generic) ------------ */

  const [newMeth, setNewMeth] = React.useState("");
  const [newPhase, setNewPhase] = React.useState<Record<string, string>>({});
  const [newType, setNewType] = React.useState({ name: "", subtitle: "", methodologyId: "" });

  async function create(body: Record<string, unknown>, busyKey: string, okMsg: string): Promise<boolean> {
    if (pending.has(busyKey)) return false;
    mark(busyKey, true);
    try {
      const res = await fetch("/api/admin/sap-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Create failed");
      toast.success(okMsg);
      await load();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Create failed");
      return false;
    } finally {
      mark(busyKey, false);
    }
  }

  async function remove(param: string, id: string, okMsg: string) {
    if (pending.has(id)) return;
    mark(id, true);
    try {
      const res = await fetch(`/api/admin/sap-config?${param}=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed");
      toast.success(okMsg);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      mark(id, false);
    }
  }

  async function createMethodology() {
    const name = newMeth.trim();
    if (name.length < 2) return toast.error("Give the methodology a name");
    if (await create({ action: "createMethodology", name }, "new-meth", `Methodology “${name}” created — add its phases below`)) {
      setNewMeth("");
    }
  }

  async function createPhase(m: Methodology) {
    const name = (newPhase[m.id] ?? "").trim();
    if (!name) return toast.error("Give the phase a name");
    if (await create({ action: "createPhase", methodologyId: m.id, name }, `new-phase-${m.id}`, `Phase “${name}” added`)) {
      setNewPhase((prev) => ({ ...prev, [m.id]: "" }));
    }
  }

  async function createType() {
    const name = newType.name.trim();
    if (name.length < 2) return toast.error("Give the transformation type a name");
    if (!newType.methodologyId) return toast.error("Pick its default roadmap");
    if (
      await create(
        {
          action: "createTransformationType",
          name,
          subtitle: newType.subtitle.trim() || null,
          methodologyId: newType.methodologyId,
        },
        "new-type",
        `“${name}” added to the catalog`
      )
    ) {
      setNewType({ name: "", subtitle: "", methodologyId: "" });
    }
  }

  /* ------------------------ transformation types --------------------- */

  async function patchType(t: TransformationType, data: { active?: boolean; methodologyId?: string }) {
    setTypes((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? {
              ...x,
              ...(data.active !== undefined ? { active: data.active } : {}),
              ...(data.methodologyId !== undefined
                ? { methodology: methodologies.find((m) => m.id === data.methodologyId)
                    ? { id: data.methodologyId, name: methodologies.find((m) => m.id === data.methodologyId)!.name }
                    : x.methodology }
                : {}),
            }
          : x
      )
    );
    await patch({ transformationType: { id: t.id, ...data } }, t.id);
  }

  /* ------------------------------ render ------------------------------ */

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------- Pipeline gates ---------------------- */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Pipeline gates
          </CardTitle>
          <CardDescription>
            Enforce delivery discipline: block opportunities from entering a stage until the requirement is met.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Approved quotation required from</Label>
            <Select
              value={gates.quoteRequiredStage ?? OFF}
              onValueChange={(v) => void setGate("quoteRequiredStage", v)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFF}>Disabled — never required</SelectItem>
                {GATE_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label} →
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Moving into this stage (or beyond) requires an approved / sent / accepted quotation.
            </p>
          </div>
          <div>
            <Label>Project required from</Label>
            <Select
              value={gates.projectRequiredStage ?? OFF}
              onValueChange={(v) => void setGate("projectRequiredStage", v)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFF}>Disabled — never required</SelectItem>
                {GATE_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label} →
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Moving into this stage (or beyond) requires a project created from the opportunity.
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-card/60 p-3">
            <div>
              <div className="text-sm font-medium">Sequential phase execution</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Work can’t start or finish in a phase until every earlier phase is completed.
              </p>
            </div>
            <Switch
              checked={gates.sequentialPhases}
              onCheckedChange={(v) => void setGovernance("sequentialPhases", v)}
            />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-card/60 p-3">
            <div>
              <div className="text-sm font-medium">Completion requires all phases</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A project can’t be marked Completed while any phase is still open.
              </p>
            </div>
            <Switch
              checked={gates.completeRequiresAllPhases}
              onCheckedChange={(v) => void setGovernance("completeRequiresAllPhases", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* --------------------- Methodology templates --------------------- */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" /> Methodology templates
          </CardTitle>
          <CardDescription>
            Phases, durations and deliverables used when a project is created — SAP Activate ships seeded, and
            you can build any methodology from scratch. New projects copy the template; existing projects keep
            their instantiated roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* create a methodology from scratch */}
          <div className="flex items-center gap-2 rounded-2xl border border-dashed p-3">
            <Input
              placeholder="New methodology name (e.g. Agile Delivery, Waterfall, Oracle OUM)…"
              value={newMeth}
              onChange={(e) => setNewMeth(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createMethodology();
                }
              }}
              className="h-9 flex-1 text-sm"
            />
            <Button size="sm" variant="gradient" className="h-9" disabled={pending.has("new-meth")} onClick={() => void createMethodology()}>
              {pending.has("new-meth") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New methodology
            </Button>
          </div>
          {methodologies.map((m) => {
            const isOpen = openMeth === m.id;
            const totalWeeks = m.phases.reduce((n, p) => n + (p.active ? p.durationWeeks : 0), 0);
            return (
              <div key={m.id} className="rounded-2xl border bg-card/60">
                <div className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    onClick={() => setOpenMeth(isOpen ? null : m.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.phases.length} phases · {totalWeeks} weeks · {m.key}
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {pending.has(m.id) ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => void remove("methodologyId", m.id, `“${m.name}” deleted`)}
                      aria-label={`Delete ${m.name}`}
                      title="Delete methodology (blocked while projects or catalog entries use it)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3">
                    {m.phases.map((p) => (
                      <div key={p.id} className="rounded-xl border bg-background/60 p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                          <Input
                            defaultValue={p.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== p.name) void patchPhase(p, { name: v });
                            }}
                            className="h-8 w-40 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus:border-input focus:bg-background"
                          />
                          <div className="ml-auto flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={1}
                                max={200}
                                defaultValue={p.durationWeeks}
                                onBlur={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (Number.isFinite(v) && v >= 1 && v !== p.durationWeeks) {
                                    void patchPhase(p, { durationWeeks: v });
                                  }
                                }}
                                className="h-8 w-16 text-center text-sm"
                              />
                              <span className="text-xs text-muted-foreground">wk</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Active</span>
                              <Switch
                                checked={p.active}
                                onCheckedChange={(v) => void patchPhase(p, { active: v })}
                              />
                            </div>
                            {pending.has(p.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => void remove("phaseId", p.id, `Phase “${p.name}” deleted`)}
                                aria-label={`Delete phase ${p.name}`}
                                title="Delete phase from the template (existing projects keep their copy)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {p.deliverables.map((d) => (
                            <li key={d.id} className="flex items-center gap-2">
                              <Input
                                defaultValue={d.name}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && v !== d.name) void patchDeliverable(d, { name: v });
                                }}
                                className={cn(
                                  "h-8 flex-1 border-transparent bg-transparent px-2 text-sm shadow-none hover:border-input focus:border-input focus:bg-background",
                                  !d.active && "opacity-50 line-through"
                                )}
                              />
                              <Switch
                                checked={d.active}
                                onCheckedChange={(v) => void patchDeliverable(d, { active: v })}
                                aria-label="Toggle deliverable"
                              />
                              {pending.has(d.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => void removeDeliverable(d)}
                                  aria-label="Delete deliverable"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            placeholder="Add deliverable…"
                            value={newDeliverable[p.id] ?? ""}
                            onChange={(e) => setNewDeliverable((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !pending.has(`add-${p.id}`)) {
                                e.preventDefault();
                                void addDeliverable(p);
                              }
                            }}
                            className="h-8 flex-1 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={pending.has(`add-${p.id}`)}
                            onClick={() => void addDeliverable(p)}
                          >
                            {pending.has(`add-${p.id}`) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* add a phase to this methodology */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add phase (e.g. Design, Build, Hypercare)…"
                        value={newPhase[m.id] ?? ""}
                        onChange={(e) => setNewPhase((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void createPhase(m);
                          }
                        }}
                        className="h-8 flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={pending.has(`new-phase-${m.id}`)}
                        onClick={() => void createPhase(m)}
                      >
                        {pending.has(`new-phase-${m.id}`) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Add phase
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* --------------------- Transformation catalog --------------------- */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" /> SAP transformation catalog
          </CardTitle>
          <CardDescription>
            The transformation types offered when converting an opportunity into a project; each maps to a
            default roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {types.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-3",
                  !t.active && "opacity-55"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  {t.subtitle && <div className="truncate text-xs text-muted-foreground">{t.subtitle}</div>}
                </div>
                <Select
                  value={t.methodology?.id ?? ""}
                  onValueChange={(v) => void patchType(t, { methodologyId: v })}
                >
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue placeholder="Default roadmap" />
                  </SelectTrigger>
                  <SelectContent>
                    {methodologies.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Active</span>
                  <Switch checked={t.active} onCheckedChange={(v) => void patchType(t, { active: v })} />
                </div>
                {pending.has(t.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => void remove("transformationTypeId", t.id, `“${t.name}” removed from the catalog`)}
                    aria-label={`Delete ${t.name}`}
                    title="Delete from the catalog (blocked while projects use it)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {/* add a catalog entry */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed p-3">
            <Input
              placeholder="New type (e.g. BTP Extension)…"
              value={newType.name}
              onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
              className="h-9 w-44 flex-1 text-sm"
            />
            <Input
              placeholder="Subtitle (optional)"
              value={newType.subtitle}
              onChange={(e) => setNewType((p) => ({ ...p, subtitle: e.target.value }))}
              className="h-9 w-44 flex-1 text-sm"
            />
            <Select
              value={newType.methodologyId || undefined}
              onValueChange={(v) => setNewType((p) => ({ ...p, methodologyId: v }))}
            >
              <SelectTrigger className="h-9 w-56 text-xs">
                <SelectValue placeholder="Default roadmap" />
              </SelectTrigger>
              <SelectContent>
                {methodologies.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="gradient" className="h-9" disabled={pending.has("new-type")} onClick={() => void createType()}>
              {pending.has("new-type") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add type
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="soft" className="text-[10px]">Note</Badge>
            SAP Roadmap Viewer has no public API — these templates model the published SAP Activate structure
            and are fully yours to tailor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
