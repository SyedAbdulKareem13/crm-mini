"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  Settings2,
  ListChecks,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  Type,
  AlignLeft,
  Hash,
  CircleDollarSign,
  Calendar as CalendarIcon,
  Mail,
  Phone,
  ListFilter,
  Sparkles,
  // activity-type icons
  Users,
  Clock,
  CheckSquare,
  StickyNote,
  Activity as ActivityIcon,
  MessageSquare,
  FileText,
  Video,
  Coffee,
  Zap,
  Star,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

type ModuleKey =
  | "LEAD"
  | "OPPORTUNITY"
  | "CUSTOMER"
  | "QUOTATION"
  | "RFQ"
  | "ACTIVITY";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "email"
  | "phone"
  | "select";

type FieldConfig = {
  id: string;
  module: ModuleKey;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  position: number;
  isCustom: boolean;
  fieldType: FieldType;
  options: string[] | null;
  helpText: string | null;
};

type ActivityType = {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  active: boolean;
  position: number;
};

type SubTab = "fields" | "activity";

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "LEAD", label: "Leads" },
  { key: "OPPORTUNITY", label: "Opportunities" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "QUOTATION", label: "Quotations" },
  { key: "RFQ", label: "RFQs" },
  { key: "ACTIVITY", label: "Activities" },
];

const FIELD_TYPES: { value: FieldType; label: string; icon: LucideIcon }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "textarea", label: "Text area", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "currency", label: "Currency", icon: CircleDollarSign },
  { value: "date", label: "Date", icon: CalendarIcon },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "select", label: "Select", icon: ListFilter },
];

const FIELD_TYPE_MAP: Record<FieldType, { label: string; icon: LucideIcon }> =
  FIELD_TYPES.reduce(
    (acc, t) => {
      acc[t.value] = { label: t.label, icon: t.icon };
      return acc;
    },
    {} as Record<FieldType, { label: string; icon: LucideIcon }>
  );

const ICON_MAP: Record<string, LucideIcon> = {
  Phone,
  Users,
  Mail,
  Clock,
  CheckSquare,
  StickyNote,
  Activity: ActivityIcon,
  Calendar: CalendarIcon,
  MessageSquare,
  FileText,
  Video,
  Coffee,
  Zap,
  Star,
  Flag,
};

const ICON_NAMES = Object.keys(ICON_MAP);

function iconByName(name: string): LucideIcon {
  return ICON_MAP[name] ?? ActivityIcon;
}

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.035, 0.4), duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

/* ------------------------------------------------------------------ *
 * Root component
 * ------------------------------------------------------------------ */

export function ConfigurationManager() {
  const [tab, setTab] = useState<SubTab>("fields");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            Configuration
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tailor how every module captures data and how teams log their work.
          </p>
        </div>

        <SubNav tab={tab} onChange={setTab} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "fields" ? <FieldsPanel /> : <ActivityTypesPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ConfigurationManager;

/* ------------------------------------------------------------------ *
 * Sub navigation (segmented)
 * ------------------------------------------------------------------ */

function SubNav({ tab, onChange }: { tab: SubTab; onChange: (t: SubTab) => void }) {
  const items: { value: SubTab; label: string; icon: LucideIcon }[] = [
    { value: "fields", label: "Fields", icon: ListChecks },
    { value: "activity", label: "Activity types", icon: ActivityIcon },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
      {items.map((it) => {
        const active = tab === it.value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="config-subnav-active"
                className="absolute inset-0 rounded-lg bg-card shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FIELDS PANEL
 * ------------------------------------------------------------------ */

function FieldsPanel() {
  const [module, setModule] = useState<ModuleKey>("LEAD");
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // add-field form
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [adding, setAdding] = useState(false);

  const moduleLabel = MODULES.find((m) => m.key === module)?.label ?? module;

  const load = useCallback(async (m: ModuleKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/field-config?module=${m}`);
      if (!res.ok) throw new Error("load failed");
      const data: { fields: FieldConfig[] } = await res.json();
      const sorted = [...data.fields].sort((a, b) => a.position - b.position);
      setFields(sorted);
    } catch {
      toast.error("Could not load fields for this module");
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(module);
  }, [module, load]);

  const setPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /* ---- PATCH a single field (optimistic) ----
   * On failure we re-fetch the module rather than restoring a captured
   * snapshot: a stale snapshot would clobber other rows edited concurrently. */
  const patchField = useCallback(
    async (id: string, patch: Partial<Pick<FieldConfig, "label" | "active" | "required" | "helpText" | "options">>) => {
      setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      setPending(id, true);
      try {
        const res = await fetch("/api/admin/field-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
        if (!res.ok) throw new Error("patch failed");
        const data: { field: FieldConfig } = await res.json();
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...data.field } : f)));
      } catch {
        toast.error("Update failed — reverted");
        void load(module);
      } finally {
        setPending(id, false);
      }
    },
    [setPending, load, module]
  );

  /* ---- Reorder (optimistic) ---- */
  const reorder = useCallback(
    async (from: number, to: number) => {
      if (to < 0 || to >= fields.length || from === to) return;
      const next = [...fields];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const reindexed = next.map((f, i) => ({ ...f, position: i }));
      setFields(reindexed);
      try {
        const res = await fetch("/api/admin/field-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module, order: reindexed.map((f) => f.id) }),
        });
        if (!res.ok) throw new Error("reorder failed");
      } catch {
        toast.error("Reorder failed — reverted");
        void load(module);
      }
    },
    [fields, module, load]
  );

  /* ---- Add custom field ---- */
  const addField = useCallback(async () => {
    if (adding) return;
    const label = newLabel.trim();
    if (!label) {
      toast.error("Give the field a label");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/field-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, label, fieldType: newType }),
      });
      if (!res.ok) throw new Error("add failed");
      const data: { field: FieldConfig } = await res.json();
      setFields((prev) =>
        [...prev, data.field].sort((a, b) => a.position - b.position)
      );
      setNewLabel("");
      setNewType("text");
      toast.success(`Added “${label}” to ${moduleLabel}`);
    } catch {
      toast.error("Could not add field");
    } finally {
      setAdding(false);
    }
  }, [adding, newLabel, newType, module, moduleLabel]);

  /* ---- Delete custom field (optimistic) ---- */
  const deleteField = useCallback(
    async (id: string) => {
      const target = fields.find((f) => f.id === id);
      setFields((prev) => prev.filter((f) => f.id !== id));
      try {
        const res = await fetch(`/api/admin/field-config?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete failed");
        toast.success(`Removed “${target?.label ?? "field"}”`);
      } catch {
        toast.error("Delete failed — reverted");
        void load(module);
      }
    },
    [fields, load, module]
  );

  return (
    <Card className="luxury-card overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Form fields
          </CardTitle>
          <CardDescription>
            These control how each module’s create &amp; edit forms render — the field
            label, whether it’s shown, its order, and if it’s required.
          </CardDescription>
        </div>

        {/* Module picker */}
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => {
            const active = m.key === module;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setModule(m.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Add field */}
        <div className="rounded-2xl border border-dashed bg-muted/30 p-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="new-field-label" className="text-xs text-muted-foreground">
                New field label
              </Label>
              <Input
                id="new-field-label"
                value={newLabel}
                placeholder={`e.g. “Procurement contact”`}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !adding) {
                    e.preventDefault();
                    void addField();
                  }
                }}
                className="mt-1.5"
              />
            </div>
            <div className="sm:w-48">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 opacity-70" />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="gradient"
              onClick={() => void addField()}
              disabled={adding}
              className="shrink-0"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add field
            </Button>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            {module === "ACTIVITY" ? (
              <span>Custom fields appear on the {moduleLabel} form and their values are saved. Remove anytime.</span>
            ) : (
              <span>
                Showing, hiding, relabelling, reordering and requiring the core fields above is fully live for{" "}
                {moduleLabel}. Capturing values for <em>custom</em> fields on the {moduleLabel} form is rolling out —
                today it’s live for Activities.
              </span>
            )}
          </p>
        </div>

        {/* Field list */}
        {loading ? (
          <FieldsSkeleton />
        ) : fields.length === 0 ? (
          <EmptyBlock
            icon={ListChecks}
            title="No fields configured"
            description={`Add the first field for ${moduleLabel} using the control above.`}
          />
        ) : (
          <motion.ul layout className="space-y-2">
            <AnimatePresence initial={false}>
              {fields.map((f, i) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  index={i}
                  total={fields.length}
                  pending={pendingIds.has(f.id)}
                  onMoveUp={() => void reorder(i, i - 1)}
                  onMoveDown={() => void reorder(i, i + 1)}
                  onLabel={(label) => void patchField(f.id, { label })}
                  onActive={(active) => void patchField(f.id, { active })}
                  onRequired={(required) => void patchField(f.id, { required })}
                  onDelete={() => void deleteField(f.id)}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  index,
  total,
  pending,
  onMoveUp,
  onMoveDown,
  onLabel,
  onActive,
  onRequired,
  onDelete,
}: {
  field: FieldConfig;
  index: number;
  total: number;
  pending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLabel: (label: string) => void;
  onActive: (active: boolean) => void;
  onRequired: (required: boolean) => void;
  onDelete: () => void;
}) {
  const [label, setLabelState] = useState(field.label);
  useEffect(() => setLabelState(field.label), [field.label]);

  const typeMeta = FIELD_TYPE_MAP[field.fieldType] ?? FIELD_TYPE_MAP.text;
  const TypeIcon = typeMeta.icon;
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setLabelState(field.label);
      return;
    }
    if (trimmed !== field.label) onLabel(trimmed);
  };

  return (
    <motion.li
      layout
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border bg-card/60 p-2.5 transition-colors hover:border-foreground/15",
        !field.active && "opacity-55"
      )}
    >
      {/* Reorder */}
      <div className="flex flex-col items-center text-muted-foreground">
        <GripVertical className="mb-0.5 h-3.5 w-3.5 opacity-40" />
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={onMoveUp}
            className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-25"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-25"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabelState(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
            }
            if (e.key === "Escape") {
              setLabelState(field.label);
              inputRef.current?.blur();
            }
          }}
          className="h-9 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus:border-input focus:bg-background"
        />
        <span className="ml-2 truncate text-[11px] text-muted-foreground">{field.fieldKey}</span>
      </div>

      {/* Type chip */}
      <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
        <TypeIcon className="h-3 w-3" />
        {typeMeta.label}
      </Badge>

      {/* Custom badge */}
      {field.isCustom && (
        <Badge variant="soft" className="hidden md:inline-flex">
          Custom
        </Badge>
      )}

      {/* Active */}
      <div className="flex items-center gap-1.5">
        <span className="hidden text-xs text-muted-foreground lg:inline">Active</span>
        <Switch checked={field.active} onCheckedChange={onActive} aria-label="Toggle active" />
      </div>

      {/* Required */}
      <div className="flex items-center gap-1.5">
        <span className="hidden text-xs text-muted-foreground lg:inline">Required</span>
        <Switch
          checked={field.required}
          onCheckedChange={onRequired}
          aria-label="Toggle required"
        />
      </div>

      {/* Pending / delete */}
      <div className="flex w-8 items-center justify-center">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : field.isCustom ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            aria-label="Delete field"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ *
 * ACTIVITY TYPES PANEL
 * ------------------------------------------------------------------ */

function ActivityTypesPanel() {
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const setPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activity-types");
      if (!res.ok) throw new Error("load failed");
      const data: { types: ActivityType[] } = await res.json();
      setTypes([...data.types].sort((a, b) => a.position - b.position));
    } catch {
      toast.error("Could not load activity types");
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  /* On failure we re-fetch rather than restoring a captured snapshot, which
   * would clobber other types edited concurrently. */
  const patchType = useCallback(
    async (id: string, patch: Partial<Pick<ActivityType, "label" | "icon" | "color" | "active">>) => {
      setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      setPending(id, true);
      try {
        const res = await fetch("/api/admin/activity-types", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
        if (!res.ok) throw new Error("patch failed");
        const data: { type: ActivityType } = await res.json();
        setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...data.type } : t)));
      } catch {
        toast.error("Update failed — reverted");
        void loadTypes();
      } finally {
        setPending(id, false);
      }
    },
    [setPending, loadTypes]
  );

  const reorder = useCallback(
    async (from: number, to: number) => {
      if (to < 0 || to >= types.length || from === to) return;
      const next = [...types];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const reindexed = next.map((t, i) => ({ ...t, position: i }));
      setTypes(reindexed);
      try {
        const res = await fetch("/api/admin/activity-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: reindexed.map((t) => t.id) }),
        });
        if (!res.ok) throw new Error("reorder failed");
      } catch {
        toast.error("Reorder failed — reverted");
        void loadTypes();
      }
    },
    [types, loadTypes]
  );

  return (
    <Card className="luxury-card overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-primary" /> Activity types
        </CardTitle>
        <CardDescription>
          These are the activity types available when logging activities on leads &amp;
          opportunities. Tune their label, icon, colour and order.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <ActivitySkeleton />
        ) : types.length === 0 ? (
          <EmptyBlock
            icon={ActivityIcon}
            title="No activity types"
            description="Activity types will appear here once configured."
          />
        ) : (
          <motion.ul layout className="space-y-2">
            <AnimatePresence initial={false}>
              {types.map((t, i) => (
                <ActivityTypeRow
                  key={t.id}
                  type={t}
                  index={i}
                  total={types.length}
                  pending={pendingIds.has(t.id)}
                  onMoveUp={() => void reorder(i, i - 1)}
                  onMoveDown={() => void reorder(i, i + 1)}
                  onLabel={(label) => void patchType(t.id, { label })}
                  onIcon={(icon) => void patchType(t.id, { icon })}
                  onColor={(color) => void patchType(t.id, { color })}
                  onActive={(active) => void patchType(t.id, { active })}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityTypeRow({
  type,
  index,
  total,
  pending,
  onMoveUp,
  onMoveDown,
  onLabel,
  onIcon,
  onColor,
  onActive,
}: {
  type: ActivityType;
  index: number;
  total: number;
  pending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLabel: (label: string) => void;
  onIcon: (icon: string) => void;
  onColor: (color: string) => void;
  onActive: (active: boolean) => void;
}) {
  const [label, setLabelState] = useState(type.label);
  useEffect(() => setLabelState(type.label), [type.label]);

  const Icon = iconByName(type.icon);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setLabelState(type.label);
      return;
    }
    if (trimmed !== type.label) onLabel(trimmed);
  };

  return (
    <motion.li
      layout
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border bg-card/60 p-2.5 transition-colors hover:border-foreground/15",
        !type.active && "opacity-55"
      )}
    >
      {/* Reorder */}
      <div className="flex flex-col items-center text-muted-foreground">
        <GripVertical className="mb-0.5 h-3.5 w-3.5 opacity-40" />
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={onMoveUp}
            className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-25"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:opacity-25"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Icon preview */}
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${type.color}1f`, color: type.color }}
      >
        <Icon className="h-4 w-4" />
      </span>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabelState(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
            }
            if (e.key === "Escape") {
              setLabelState(type.label);
              inputRef.current?.blur();
            }
          }}
          className="h-9 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus:border-input focus:bg-background"
        />
        <span className="ml-2 text-[11px] text-muted-foreground">{type.key}</span>
      </div>

      {/* Icon select */}
      <div className="hidden sm:block sm:w-40">
        <Select value={type.icon} onValueChange={onIcon}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_NAMES.map((name) => {
              const NameIcon = iconByName(name);
              return (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <NameIcon className="h-3.5 w-3.5 opacity-80" />
                    {name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Colour swatch */}
      <label
        className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border"
        style={{ backgroundColor: type.color }}
        aria-label="Pick colour"
        title={type.color}
      >
        <input
          type="color"
          value={normalizeHex(type.color)}
          onChange={(e) => onColor(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      {/* Active */}
      <div className="flex items-center gap-1.5">
        <span className="hidden text-xs text-muted-foreground lg:inline">Active</span>
        <Switch checked={type.active} onCheckedChange={onActive} aria-label="Toggle active" />
      </div>

      {/* Pending */}
      <div className="flex w-5 items-center justify-center">
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ *
 * Helpers / shared bits
 * ------------------------------------------------------------------ */

function normalizeHex(c: string): string {
  // <input type=color> requires a 7-char #rrggbb value.
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    const r = c[1];
    const g = c[2];
    const b = c[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#6366f1";
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

function FieldsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-card/40 p-3">
          <Skeleton className="h-8 w-6" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="hidden h-6 w-20 sm:block" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-card/40 p-3">
          <Skeleton className="h-8 w-6" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="hidden h-9 w-40 sm:block" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>
  );
}