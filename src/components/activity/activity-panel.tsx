"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Phone,
  Users,
  Mail,
  Clock,
  CheckSquare,
  StickyNote,
  Activity as ActivityIcon,
  Calendar,
  MessageSquare,
  FileText,
  Video,
  Coffee,
  Zap,
  Star,
  Flag,
  Check,
  Loader2,
  Plus,
  Pencil,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type ActivityStatus = "PLANNED" | "COMPLETED" | "CANCELLED" | "OVERDUE";

type PostActivityType =
  | "CALL"
  | "MEETING"
  | "EMAIL"
  | "FOLLOW_UP"
  | "TASK"
  | "NOTE";

interface ActivityOwner {
  name: string | null;
  image: string | null;
}

interface ActivityRecord {
  id: string;
  type: string;
  status: ActivityStatus;
  subject: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  owner: ActivityOwner | null;
}

interface ActivityType {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  active: boolean;
  position: number;
}

interface FieldConfig {
  id: string;
  module: string;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  position: number;
  isCustom: boolean;
  fieldType: string;
  options: string[] | null;
  helpText: string | null;
}

export interface ActivityPanelProps {
  entity: "lead" | "opportunity";
  entityId: string;
}

/* ------------------------------------------------------------------ */
/* Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, LucideIcon> = {
  Phone,
  Users,
  Mail,
  Clock,
  CheckSquare,
  StickyNote,
  Activity: ActivityIcon,
  Calendar,
  MessageSquare,
  FileText,
  Video,
  Coffee,
  Zap,
  Star,
  Flag,
};

function iconFor(name: string | null | undefined): LucideIcon {
  if (name && ICONS[name]) return ICONS[name];
  return ActivityIcon;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const RESERVED_KEYS = new Set([
  "type",
  "subject",
  "dueAt",
  "status",
  "description",
]);

function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = now - t;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  let label: string;
  if (sec < 45) label = "just now";
  else if (min < 60) label = `${min}m`;
  else if (hr < 24) label = `${hr}h`;
  else if (day < 30) label = `${day}d`;
  else {
    const mon = Math.round(day / 30);
    label = mon < 12 ? `${mon}mo` : `${Math.round(mon / 12)}y`;
  }
  if (label === "just now") return label;
  return future ? `in ${label}` : `${label} ago`;
}

function statusBadgeVariant(
  status: ActivityStatus
): "success" | "warning" | "soft" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "OVERDUE":
      return "warning";
    case "CANCELLED":
      return "outline";
    default:
      return "soft";
  }
}

function prettyStatus(status: ActivityStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Map an activity-type key to the canonical POST type. */
function toPostType(key: string): PostActivityType {
  const k = key.toUpperCase();
  const allowed: PostActivityType[] = [
    "CALL",
    "MEETING",
    "EMAIL",
    "FOLLOW_UP",
    "TASK",
    "NOTE",
  ];
  if ((allowed as string[]).includes(k)) return k as PostActivityType;
  if (k === "FOLLOWUP" || k === "FOLLOW-UP") return "FOLLOW_UP";
  return "TASK";
}

/** Format a stored data value for display. */
function formatDataValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Convert a stored ISO timestamp to a value for <input type="datetime-local">. */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const FIELD_FALLBACK = { dueAt: true, status: true, description: true };

export function ActivityPanel({ entity, entityId }: ActivityPanelProps) {
  const [loading, setLoading] = React.useState(true);
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [types, setTypes] = React.useState<ActivityType[]>([]);
  const [fields, setFields] = React.useState<FieldConfig[]>([]);

  // Composer state
  const [selectedKey, setSelectedKey] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>("PLANNED");
  const [customValues, setCustomValues] = React.useState<
    Record<string, string | boolean>
  >({});
  const [submitting, setSubmitting] = React.useState(false);

  // Mark-done in-flight tracking
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set());

  // Edit dialog state
  const [editing, setEditing] = React.useState<ActivityRecord | null>(null);
  const [editKey, setEditKey] = React.useState<string>("");
  const [editSubject, setEditSubject] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editDueAt, setEditDueAt] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<ActivityStatus>("PLANNED");
  const [editCustom, setEditCustom] = React.useState<Record<string, string | boolean>>({});
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Client-only "now" for relative time (SSR-safe).
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const idParam = entity === "lead" ? "leadId" : "opportunityId";

  /* ----------------------------- Fetch ----------------------------- */
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`/api/activities?${idParam}=${encodeURIComponent(entityId)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("activities"))))
        .catch(() => ({ activities: [] as ActivityRecord[] })),
      fetch(`/api/admin/activity-types`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("types"))))
        .catch(() => ({ types: [] as ActivityType[] })),
      fetch(`/api/admin/field-config?module=ACTIVITY`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fields"))))
        .catch(() => ({ fields: [] as FieldConfig[] })),
    ])
      .then(([actRes, typeRes, fieldRes]) => {
        if (cancelled) return;
        const acts: ActivityRecord[] = actRes?.activities ?? [];
        const activeTypes: ActivityType[] = (typeRes?.types ?? [])
          .filter((t: ActivityType) => t.active)
          .sort((a: ActivityType, b: ActivityType) => a.position - b.position);
        const fieldList: FieldConfig[] = (fieldRes?.fields ?? []).sort(
          (a: FieldConfig, b: FieldConfig) => a.position - b.position
        );
        setActivities(acts);
        setTypes(activeTypes);
        setFields(fieldList);
        if (activeTypes.length > 0) setSelectedKey(activeTypes[0].key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, idParam]);

  /* ------------------- Derived field configuration ------------------ */
  const fieldMap = React.useMemo(() => {
    const m = new Map<string, FieldConfig>();
    for (const f of fields) m.set(f.fieldKey, f);
    return m;
  }, [fields]);

  const isActive = React.useCallback(
    (key: keyof typeof FIELD_FALLBACK): boolean => {
      const f = fieldMap.get(key);
      if (!f) return FIELD_FALLBACK[key];
      return f.active;
    },
    [fieldMap]
  );

  const labelFor = React.useCallback(
    (key: string, fallback: string): string => fieldMap.get(key)?.label ?? fallback,
    [fieldMap]
  );

  const showDueAt = isActive("dueAt");
  const showStatus = isActive("status");
  const showDescription = isActive("description");

  const customFields = React.useMemo(
    () =>
      fields.filter(
        (f) => f.active && f.isCustom && !RESERVED_KEYS.has(f.fieldKey)
      ),
    [fields]
  );

  const typeByKey = React.useMemo(() => {
    const m = new Map<string, ActivityType>();
    for (const t of types) m.set(t.key, t);
    return m;
  }, [types]);

  /* ---------------------------- Submit ----------------------------- */
  const resetComposer = React.useCallback(() => {
    setSubject("");
    setDescription("");
    setDueAt("");
    setStatus("PLANNED");
    setCustomValues({});
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = subject.trim();
      if (!selectedKey) {
        toast.error("Pick an activity type");
        return;
      }
      if (!trimmed) {
        toast.error("Subject is required");
        return;
      }
      if (submitting) return;

      const data: Record<string, unknown> = {};
      for (const f of customFields) {
        const v = customValues[f.fieldKey];
        if (v !== undefined && v !== "") data[f.fieldKey] = v;
      }

      const postType = toPostType(selectedKey);
      const dueIso =
        showDueAt && dueAt ? new Date(dueAt).toISOString() : undefined;
      const effStatus = showStatus ? status : "PLANNED";

      const tempId = `temp-${Date.now()}`;
      const optimistic: ActivityRecord = {
        id: tempId,
        type: selectedKey,
        status: effStatus,
        subject: trimmed,
        description: showDescription && description.trim() ? description.trim() : null,
        dueAt: dueIso ?? null,
        completedAt: effStatus === "COMPLETED" ? new Date().toISOString() : null,
        data: Object.keys(data).length ? data : null,
        createdAt: new Date().toISOString(),
        owner: null,
      };

      setSubmitting(true);
      setActivities((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch(`/api/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: postType,
            subject: trimmed,
            description: showDescription && description.trim() ? description.trim() : undefined,
            dueAt: dueIso,
            status: showStatus ? effStatus : undefined,
            data: Object.keys(data).length ? data : undefined,
            [idParam]: entityId,
          }),
        });
        if (!res.ok) throw new Error("Failed to log activity");
        const json = await res.json();
        const saved: ActivityRecord = json.activity;
        setActivities((prev) =>
          prev.map((a) => (a.id === tempId ? saved : a))
        );
        resetComposer();
        toast.success("Activity logged");
      } catch {
        setActivities((prev) => prev.filter((a) => a.id !== tempId));
        toast.error("Couldn't log activity");
      } finally {
        setSubmitting(false);
      }
    },
    [
      subject,
      selectedKey,
      submitting,
      customFields,
      customValues,
      showDueAt,
      dueAt,
      showStatus,
      status,
      showDescription,
      description,
      idParam,
      entityId,
      resetComposer,
    ]
  );

  /* --------------------------- Mark done --------------------------- */
  const markDone = React.useCallback(
    async (id: string) => {
      if (busyIds.has(id)) return;
      const prevActivities = activities;
      setBusyIds((s) => new Set(s).add(id));
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "COMPLETED", completedAt: new Date().toISOString() }
            : a
        )
      );
      try {
        const res = await fetch(`/api/activities`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "COMPLETED" }),
        });
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (json?.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === id ? json.activity : a))
          );
        }
        toast.success("Marked done");
      } catch {
        setActivities(prevActivities);
        toast.error("Couldn't update activity");
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [activities, busyIds]
  );

  /* ----------------------------- Edit ------------------------------ */
  const openEdit = React.useCallback((a: ActivityRecord) => {
    setEditing(a);
    setEditKey(a.type);
    setEditSubject(a.subject);
    setEditDescription(a.description ?? "");
    setEditDueAt(toDateTimeLocal(a.dueAt));
    setEditStatus(a.status);
    const seed: Record<string, string | boolean> = {};
    if (a.data) {
      for (const [k, v] of Object.entries(a.data)) {
        if (typeof v === "boolean") seed[k] = v;
        else if (v !== null && v !== undefined) seed[k] = String(v);
      }
    }
    setEditCustom(seed);
  }, []);

  const handleEditSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editing) return;
      const trimmed = editSubject.trim();
      if (!trimmed) {
        toast.error("Subject is required");
        return;
      }
      if (savingEdit) return;

      // Merge onto the stored data so values for custom fields that are no
      // longer in the active config (deactivated/deleted) are preserved, not
      // silently wiped. Only the currently-editable keys are overwritten/cleared.
      const mergedData: Record<string, unknown> = { ...(editing.data ?? {}) };
      for (const f of customFields) {
        const v = editCustom[f.fieldKey];
        if (v === undefined || v === "") delete mergedData[f.fieldKey];
        else mergedData[f.fieldKey] = v;
      }
      const hasData = customFields.length > 0 || !!editing.data;
      const dueIso = showDueAt && editDueAt ? new Date(editDueAt).toISOString() : null;

      setSavingEdit(true);
      try {
        const res = await fetch(`/api/activities`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            type: toPostType(editKey),
            subject: trimmed,
            description: showDescription ? editDescription.trim() || null : undefined,
            dueAt: showDueAt ? dueIso : undefined,
            status: showStatus ? editStatus : undefined,
            data: hasData ? mergedData : undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        const saved: ActivityRecord = json.activity;
        setActivities((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
        setEditing(null);
        toast.success("Activity updated");
      } catch {
        toast.error("Couldn't update activity");
      } finally {
        setSavingEdit(false);
      }
    },
    [
      editing,
      editSubject,
      savingEdit,
      customFields,
      editCustom,
      showDueAt,
      editDueAt,
      showDescription,
      editDescription,
      showStatus,
      editStatus,
      editKey,
    ]
  );

  /* ----------------------------- Render ---------------------------- */
  const count = activities.length;

  return (
    <Card className="luxury-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Activity</CardTitle>
          {!loading && (
            <Badge variant="soft" className="tabular-nums">
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ---------------------- Composer ---------------------- */}
        {loading ? (
          <ComposerSkeleton />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border bg-muted/30 p-4"
          >
            {/* Type chips */}
            <div className="flex flex-wrap gap-2">
              {types.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No activity types configured.
                </span>
              ) : (
                types.map((t) => {
                  const Ico = iconFor(t.icon);
                  const selected = t.key === selectedKey;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedKey(t.key)}
                      aria-pressed={selected}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                        selected
                          ? "border-transparent text-foreground shadow-sm ring-2 ring-offset-1 ring-offset-background"
                          : "border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background"
                      )}
                      style={
                        selected
                          ? ({
                              backgroundColor: `${t.color}1f`,
                              ["--tw-ring-color" as string]: t.color,
                            } as React.CSSProperties)
                          : undefined
                      }
                    >
                      <Ico
                        className="h-4 w-4"
                        style={{ color: t.color }}
                        aria-hidden
                      />
                      {t.label}
                    </button>
                  );
                })
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="activity-subject">
                {labelFor("subject", "Subject")}
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="activity-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What happened?"
                autoComplete="off"
              />
            </div>

            {/* Due + Status row */}
            {(showDueAt || showStatus) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {showDueAt && (
                  <div className="space-y-1.5">
                    <Label htmlFor="activity-due">
                      {labelFor("dueAt", "Due / scheduled")}
                    </Label>
                    <Input
                      id="activity-due"
                      type="datetime-local"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                    />
                  </div>
                )}
                {showStatus && (
                  <div className="space-y-1.5">
                    <Label htmlFor="activity-status">
                      {labelFor("status", "Status")}
                    </Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as ActivityStatus)}
                    >
                      <SelectTrigger id="activity-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {showDescription && (
              <div className="space-y-1.5">
                <Label htmlFor="activity-notes">
                  {labelFor("description", "Notes")}
                </Label>
                <Textarea
                  id="activity-notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details…"
                  rows={3}
                />
              </div>
            )}

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {customFields.map((f) => (
                  <CustomFieldInput
                    key={f.id}
                    field={f}
                    value={customValues[f.fieldKey]}
                    onChange={(val) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.fieldKey]: val,
                      }))
                    }
                  />
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                disabled={submitting || !subject.trim() || !selectedKey}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Log activity
              </Button>
            </div>
          </form>
        )}

        {/* ---------------------- Timeline ---------------------- */}
        {loading ? (
          <TimelineSkeleton />
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="relative space-y-1">
            <AnimatePresence initial={false}>
              {activities.map((a, i) => (
                <TimelineItem
                  key={a.id}
                  activity={a}
                  type={typeByKey.get(a.type)}
                  now={now}
                  busy={busyIds.has(a.id)}
                  index={i}
                  isLast={i === activities.length - 1}
                  onMarkDone={() => markDone(a.id)}
                  onEdit={() => openEdit(a)}
                />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </CardContent>

      {/* ---------------------- Edit dialog ---------------------- */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Type chips */}
            <div className="flex flex-wrap gap-2">
              {types.map((t) => {
                const Ico = iconFor(t.icon);
                const selected = t.key === editKey;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditKey(t.key)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      selected
                        ? "border-transparent text-foreground shadow-sm ring-2 ring-offset-1 ring-offset-background"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                    style={
                      selected
                        ? ({
                            backgroundColor: `${t.color}1f`,
                            ["--tw-ring-color" as string]: t.color,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Ico className="h-4 w-4" style={{ color: t.color }} aria-hidden />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-activity-subject">
                {labelFor("subject", "Subject")}
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="edit-activity-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Due + Status */}
            {(showDueAt || showStatus) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {showDueAt && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-activity-due">{labelFor("dueAt", "Due / scheduled")}</Label>
                    <Input
                      id="edit-activity-due"
                      type="datetime-local"
                      value={editDueAt}
                      onChange={(e) => setEditDueAt(e.target.value)}
                    />
                  </div>
                )}
                {showStatus && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-activity-status">{labelFor("status", "Status")}</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ActivityStatus)}>
                      <SelectTrigger id="edit-activity-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {showDescription && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-activity-notes">{labelFor("description", "Notes")}</Label>
                <Textarea
                  id="edit-activity-notes"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {customFields.map((f) => (
                  <CustomFieldInput
                    key={f.id}
                    field={f}
                    value={editCustom[f.fieldKey]}
                    onChange={(val) =>
                      setEditCustom((prev) => ({ ...prev, [f.fieldKey]: val }))
                    }
                  />
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={savingEdit || !editSubject.trim()}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline item                                                      */
/* ------------------------------------------------------------------ */

function TimelineItem({
  activity,
  type,
  now,
  busy,
  index,
  isLast,
  onMarkDone,
  onEdit,
}: {
  activity: ActivityRecord;
  type: ActivityType | undefined;
  now: number | null;
  busy: boolean;
  index: number;
  isLast: boolean;
  onMarkDone: () => void;
  onEdit: () => void;
}) {
  const Ico = iconFor(type?.icon);
  const color = type?.color ?? "var(--primary)";
  const completed = activity.status === "COMPLETED";
  const isTemp = activity.id.startsWith("temp-");
  const dataEntries = activity.data
    ? Object.entries(activity.data).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    : [];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2) }}
      className="relative flex gap-3 pb-5"
    >
      {/* connector line */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[18px] top-10 bottom-0 w-px bg-border"
        />
      )}

      {/* icon bubble */}
      <div
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-background"
        style={{
          backgroundColor: color.startsWith("#")
            ? color + "1f"
            : "hsl(var(--muted))",
        }}
      >
        <Ico
          className="h-[18px] w-[18px]"
          style={{ color: color.startsWith("#") ? color : undefined }}
          aria-hidden
        />
      </div>

      {/* body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-medium text-foreground",
                completed && "text-muted-foreground line-through"
              )}
              title={activity.subject}
            >
              {activity.subject}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activity.owner?.name ? (
                <span className="font-medium text-foreground/80">
                  {activity.owner.name}
                </span>
              ) : (
                <span>System</span>
              )}
              {now !== null && (
                <>
                  {" · "}
                  {relativeTime(activity.createdAt, now)}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={statusBadgeVariant(activity.status)}>
              {prettyStatus(activity.status)}
            </Badge>
            {!completed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onMarkDone}
                disabled={busy}
                className="h-7 px-2 text-xs"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Mark done
              </Button>
            )}
            {!isTemp && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label="Edit activity"
                title="Edit activity"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* due time */}
        {activity.dueAt && now !== null && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            {completed && activity.completedAt
              ? `Completed ${relativeTime(activity.completedAt, now)}`
              : `Due ${relativeTime(activity.dueAt, now)}`}
          </p>
        )}

        {activity.description && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
            {activity.description}
          </p>
        )}

        {dataEntries.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dataEntries.map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-normal">
                <span className="text-muted-foreground">{prettyKey(k)}:</span>
                <span className="ml-1 text-foreground">{formatDataValue(v)}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.li>
  );
}

function prettyKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* Custom field input                                                 */
/* ------------------------------------------------------------------ */

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
}) {
  const id = `activity-custom-${field.id}`;
  const type = field.fieldType?.toUpperCase();

  if (type === "SELECT" && field.options && field.options.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{field.label}</Label>
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (type === "TEXTAREA") {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
        />
        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
  }

  const inputType =
    type === "NUMBER"
      ? "number"
      : type === "DATE"
        ? "date"
        : type === "DATETIME"
          ? "datetime-local"
          : type === "EMAIL"
            ? "email"
            : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={inputType}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty + skeletons                                                  */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ActivityIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">No activity yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Log a call, meeting or note to get started.
      </p>
    </motion.div>
  );
}

function ComposerSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityPanel;