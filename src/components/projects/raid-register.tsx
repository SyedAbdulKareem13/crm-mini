"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------- types -------------------------------- */

export type RaidItem = {
  id: string;
  type: string; // RISK | ASSUMPTION | ISSUE | DEPENDENCY
  title: string;
  description: string | null;
  severity: string; // LOW | MEDIUM | HIGH | CRITICAL
  probability: string | null; // LOW | MEDIUM | HIGH (risks)
  status: string; // OPEN | MITIGATING | CLOSED
  mitigation: string | null;
  ownerId: string | null;
  ownerName: string | null;
  dueDate: string | null; // ISO string
  createdAt: string; // ISO string
};

type Member = { id: string; name: string | null };

const TYPES = [
  { key: "RISK", label: "Risks", singular: "Risk" },
  { key: "ASSUMPTION", label: "Assumptions", singular: "Assumption" },
  { key: "ISSUE", label: "Issues", singular: "Issue" },
  { key: "DEPENDENCY", label: "Dependencies", singular: "Dependency" },
] as const;

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const PROBABILITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATING", label: "Mitigating" },
  { value: "CLOSED", label: "Closed" },
] as const;

const UNASSIGNED = "__none__";

const SEVERITY_VARIANT: Record<string, "secondary" | "info" | "warning" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "destructive",
};
const TYPE_VARIANT: Record<string, "soft" | "outline"> = {
  RISK: "soft",
  ASSUMPTION: "outline",
  ISSUE: "outline",
  DEPENDENCY: "outline",
};

function typeSingular(type: string) {
  return TYPES.find((t) => t.key === type)?.singular ?? type;
}
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
function isOverdue(item: RaidItem) {
  if (!item.dueDate || item.status === "CLOSED") return false;
  return item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

/* ------------------------------ component ----------------------------- */

export function RaidRegister({
  projectId,
  initial,
  members,
  onMutated,
}: {
  projectId: string;
  initial: RaidItem[];
  members: Member[];
  onMutated?: () => void;
}) {
  const [items, setItems] = React.useState<RaidItem[]>(initial);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [showClosed, setShowClosed] = React.useState(false);

  // Add form state.
  const [newType, setNewType] = React.useState<string>("RISK");
  const [newTitle, setNewTitle] = React.useState("");
  const [newSeverity, setNewSeverity] = React.useState<string>("MEDIUM");
  const [newOwner, setNewOwner] = React.useState<string>(UNASSIGNED);
  const [newDue, setNewDue] = React.useState<string>("");
  const [adding, setAdding] = React.useState(false);

  const mark = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const memberName = (uid: string | null) =>
    uid ? members.find((m) => m.id === uid)?.name ?? null : null;

  /* --------------------------- counts / summary -------------------------- */

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { RISK: 0, ASSUMPTION: 0, ISSUE: 0, DEPENDENCY: 0 };
    for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
    return c;
  }, [items]);
  const openCritical = items.filter((it) => it.severity === "CRITICAL" && it.status !== "CLOSED").length;

  const visible = items
    .filter((it) => (typeFilter === "ALL" ? true : it.type === typeFilter))
    .filter((it) => (showClosed ? true : it.status !== "CLOSED"));

  /* ------------------------------ mutations ------------------------------ */

  async function createItem() {
    const title = newTitle.trim();
    if (title.length < 2) return toast.error("Give the item a title");
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/raid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          title,
          severity: newSeverity,
          ownerId: newOwner === UNASSIGNED ? null : newOwner,
          dueDate: newDue || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not add item");
      const created = normalize(data.item);
      setItems((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDue("");
      setNewOwner(UNASSIGNED);
      toast.success(`${typeSingular(newType)} “${created.title}” added`);
      onMutated?.();
    } catch (err: any) {
      toast.error(err?.message || "Could not add item");
    } finally {
      setAdding(false);
    }
  }

  /** Optimistic field patch with revert on failure. */
  async function patchItem(item: RaidItem, changes: Partial<RaidItem>, busyKey: string) {
    if (busy.has(busyKey)) return;
    const prev = items;
    setItems((list) => list.map((it) => (it.id === item.id ? { ...it, ...changes } : it)));
    mark(busyKey, true);
    try {
      const body: Record<string, unknown> = { id: item.id };
      if (changes.status !== undefined) body.status = changes.status;
      if (changes.severity !== undefined) body.severity = changes.severity;
      if (changes.probability !== undefined) body.probability = changes.probability;
      if (changes.mitigation !== undefined) body.mitigation = changes.mitigation || null;
      if (changes.ownerId !== undefined) body.ownerId = changes.ownerId;
      if (changes.dueDate !== undefined) body.dueDate = changes.dueDate ? changes.dueDate.slice(0, 10) : null;
      const res = await fetch(`/api/projects/${projectId}/raid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Update failed");
      // Reconcile from the server (owner name, coerced dates).
      const fresh = normalize(data.item);
      setItems((list) => list.map((it) => (it.id === item.id ? fresh : it)));
      onMutated?.();
    } catch (err: any) {
      setItems(prev);
      toast.error(err?.message || "Update failed");
    } finally {
      mark(busyKey, false);
    }
  }

  async function removeItem(item: RaidItem) {
    const key = `del-${item.id}`;
    if (busy.has(key)) return;
    const prev = items;
    setItems((list) => list.filter((it) => it.id !== item.id));
    mark(key, true);
    try {
      const res = await fetch(`/api/projects/${projectId}/raid?raidId=${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      toast.success(`Removed “${item.title}”`);
      onMutated?.();
    } catch (err: any) {
      setItems(prev);
      toast.error(err?.message || "Delete failed");
    } finally {
      mark(key, false);
    }
  }

  /* ------------------------------- render -------------------------------- */

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <div
            key={t.key}
            className="flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-1.5"
          >
            <span className="text-lg font-semibold tabular-nums leading-none">{counts[t.key] ?? 0}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.label}</span>
          </div>
        ))}
        <div
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-1.5",
            openCritical > 0
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "bg-background/60 text-muted-foreground"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="text-sm font-semibold tabular-nums">{openCritical}</span>
          <span className="text-[11px] uppercase tracking-wide">open critical</span>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-xl border bg-background/60 p-0.5">
          {([{ key: "ALL", label: "All" }, ...TYPES] as { key: string; label: string }[]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTypeFilter(t.key)}
              aria-pressed={typeFilter === t.key}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === t.key
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
          Show closed
        </label>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border bg-card/60 p-3">
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr_8rem] sm:items-center">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.singular}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Describe the risk / assumption / issue / dependency…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createItem();
              }
            }}
            className="h-9 text-sm"
          />
          <Select value={newSeverity} onValueChange={setNewSeverity}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
          <Select value={newOwner} onValueChange={setNewOwner}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name ?? "Member"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker value={newDue} onChange={setNewDue} placeholder="Due date (optional)" />
          <Button
            size="sm"
            variant="gradient"
            className="h-9"
            disabled={adding}
            onClick={() => void createItem()}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 px-4 py-10 text-center">
          <p className="text-sm font-medium">Nothing to show here yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            The RAID register tracks Risks, Assumptions, Issues and Dependencies — the governance
            log that keeps delivery honest. Add the first item above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const overdue = isOverdue(item);
            return (
              <li
                key={item.id}
                className={cn(
                  "group rounded-2xl border bg-card/60 p-3 transition-colors",
                  item.status === "CLOSED" && "opacity-60"
                )}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <Badge variant={SEVERITY_VARIANT[item.severity] ?? "secondary"} className="shrink-0">
                    {item.severity.charAt(0) + item.severity.slice(1).toLowerCase()}
                  </Badge>
                  <Badge variant={TYPE_VARIANT[item.type] ?? "outline"} className="shrink-0 font-normal">
                    {typeSingular(item.type)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm font-medium", item.status === "CLOSED" && "line-through")}>
                      {item.title}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {item.type === "RISK" && item.probability && (
                        <span>Probability: {item.probability.charAt(0) + item.probability.slice(1).toLowerCase()}</span>
                      )}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeItem(item)}
                    aria-label={`Remove ${item.title}`}
                    className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    {busy.has(`del-${item.id}`) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Controls row */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Select
                    value={item.ownerId ?? UNASSIGNED}
                    onValueChange={(v) => {
                      const ownerId = v === UNASSIGNED ? null : v;
                      void patchItem(item, { ownerId, ownerName: memberName(ownerId) }, `owner-${item.id}`);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name ?? "Member"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={item.status}
                    onValueChange={(v) => void patchItem(item, { status: v }, `status-${item.id}`)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DatePicker
                    value={dateInput(item.dueDate)}
                    onChange={(v) =>
                      void patchItem(item, { dueDate: v ? new Date(v + "T00:00:00").toISOString() : null }, `due-${item.id}`)
                    }
                    placeholder="Due date"
                    className="h-8"
                  />

                  <Input
                    defaultValue={item.mitigation ?? ""}
                    placeholder="Mitigation / action…"
                    className="h-8 text-xs"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v === (item.mitigation ?? "")) return;
                      void patchItem(item, { mitigation: v || null }, `mit-${item.id}`);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Normalize the API shape (owner relation → ownerName, Date → ISO string). */
function normalize(raw: any): RaidItem {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description ?? null,
    severity: raw.severity,
    probability: raw.probability ?? null,
    status: raw.status,
    mitigation: raw.mitigation ?? null,
    ownerId: raw.ownerId ?? null,
    ownerName: raw.owner?.name ?? raw.ownerName ?? null,
    dueDate: raw.dueDate ? (typeof raw.dueDate === "string" ? raw.dueDate : new Date(raw.dueDate).toISOString()) : null,
    createdAt: raw.createdAt ? (typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString()) : new Date().toISOString(),
  };
}
