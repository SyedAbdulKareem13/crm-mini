"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_SOURCES, INDUSTRIES } from "@/lib/constants";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"] as const;

/** Core Lead fields whose values the Lead API persists. Custom fields are
 * configurable in Admin but not stored on Lead yet, so they are not rendered. */
const PERSISTED_KEYS = new Set([
  "name",
  "company",
  "contactPerson",
  "email",
  "mobile",
  "expectedRevenue",
  "source",
  "industry",
  "status",
  "notes",
]);

type ConfigField = {
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  position: number;
  fieldType: string;
  isCustom: boolean;
  helpText: string | null;
};

/** Fallback ordering/labels used until the config request resolves. */
const FALLBACK_FIELDS: ConfigField[] = [
  { fieldKey: "name", label: "Lead name", fieldType: "text", required: true, active: true, position: 0, isCustom: false, helpText: null },
  { fieldKey: "company", label: "Company", fieldType: "text", required: true, active: true, position: 1, isCustom: false, helpText: null },
  { fieldKey: "contactPerson", label: "Contact person", fieldType: "text", required: false, active: true, position: 2, isCustom: false, helpText: null },
  { fieldKey: "email", label: "Email", fieldType: "email", required: false, active: true, position: 3, isCustom: false, helpText: null },
  { fieldKey: "mobile", label: "Mobile", fieldType: "phone", required: false, active: true, position: 4, isCustom: false, helpText: null },
  { fieldKey: "expectedRevenue", label: "Expected revenue (₹)", fieldType: "currency", required: false, active: true, position: 5, isCustom: false, helpText: null },
  { fieldKey: "source", label: "Source", fieldType: "select", required: false, active: true, position: 6, isCustom: false, helpText: null },
  { fieldKey: "industry", label: "Industry", fieldType: "select", required: false, active: true, position: 7, isCustom: false, helpText: null },
  { fieldKey: "status", label: "Status", fieldType: "select", required: false, active: true, position: 8, isCustom: false, helpText: null },
  { fieldKey: "notes", label: "Notes", fieldType: "textarea", required: false, active: true, position: 9, isCustom: false, helpText: null },
];

export type LeadForEdit = {
  id: string;
  name: string;
  company: string;
  contactPerson: string | null;
  email: string | null;
  mobile: string | null;
  source: string;
  industry: string | null;
  status: string;
  notes: string | null;
  expectedRevenue: string | number | null;
};

export function LeadDialog({
  open,
  onOpenChange,
  onCreated,
  onSaved,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (lead: any) => void;
  onSaved?: (lead: any) => void;
  lead?: LeadForEdit | null;
}) {
  const router = useRouter();
  const isEdit = !!lead;
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>(lead?.source ?? "WEBSITE");
  const [industry, setIndustry] = useState<string>(lead?.industry ?? "");
  const [status, setStatus] = useState<string>(lead?.status ?? "NEW");
  const [fields, setFields] = useState<ConfigField[]>(FALLBACK_FIELDS);

  // Pull the live Leads field configuration (label / active / required / order).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/admin/field-config?module=LEAD")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.fields?.length) setFields(data.fields as ConfigField[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.source = source;
    if (industry) payload.industry = industry;
    if (isEdit) payload.status = status;

    // Enforce configured `required`. The Select-rendered fields (source / industry /
    // status) have no native HTML5 validation, so we check them here in JS along with
    // every other active required field.
    const valueFor = (key: string): string => {
      if (key === "source") return source;
      if (key === "industry") return industry;
      if (key === "status") return status;
      const v = payload[key];
      return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
    };
    const missing = fields.find(
      (f) =>
        f.active &&
        f.required &&
        PERSISTED_KEYS.has(f.fieldKey) &&
        !f.isCustom &&
        !(f.fieldKey === "status" && !isEdit) &&
        !valueFor(f.fieldKey)
    );
    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }

    // An empty optional number would coerce to 0 server-side — drop it instead.
    if (payload.expectedRevenue === "") delete payload.expectedRevenue;

    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/leads/${lead!.id}` : "/api/leads", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(isEdit ? "Lead updated" : "Lead created");
      onOpenChange(false);
      if (isEdit) {
        onSaved?.(data.lead);
        router.refresh();
      } else {
        onCreated?.(data.lead);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const visible = fields
    .filter((f) => f.active && PERSISTED_KEYS.has(f.fieldKey) && !f.isCustom)
    .filter((f) => !(f.fieldKey === "status" && !isEdit))
    .sort((a, b) => a.position - b.position);

  function defaultFor(key: string): string {
    if (!lead) return "";
    if (key === "expectedRevenue") {
      return lead.expectedRevenue != null ? String(Number(lead.expectedRevenue)) : "";
    }
    const v = (lead as any)[key];
    return v == null ? "" : String(v);
  }

  function renderField(f: ConfigField) {
    const span = f.fieldType === "textarea" ? "sm:col-span-2" : "";

    if (f.fieldKey === "source") {
      return (
        <div key={f.fieldKey} className={span}>
          <Label>
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.toLowerCase().replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {f.helpText && <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>}
        </div>
      );
    }

    if (f.fieldKey === "industry") {
      return (
        <div key={f.fieldKey} className={span}>
          <Label>
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {f.helpText && <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>}
        </div>
      );
    }

    if (f.fieldKey === "status") {
      return (
        <div key={f.fieldKey} className={span}>
          <Label>
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {f.helpText && <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>}
        </div>
      );
    }

    if (f.fieldType === "textarea") {
      return (
        <div key={f.fieldKey} className="sm:col-span-2">
          <Label htmlFor={f.fieldKey}>
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={f.fieldKey}
            name={f.fieldKey}
            required={f.required}
            defaultValue={defaultFor(f.fieldKey)}
            className="mt-1.5"
          />
          {f.helpText && <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>}
        </div>
      );
    }

    const inputType =
      f.fieldType === "email"
        ? "email"
        : f.fieldType === "number" || f.fieldType === "currency"
          ? "number"
          : f.fieldType === "date"
            ? "date"
            : f.fieldType === "phone"
              ? "tel"
              : "text";

    return (
      <div key={f.fieldKey}>
        <Label htmlFor={f.fieldKey}>
          {f.label}
          {f.required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id={f.fieldKey}
          name={f.fieldKey}
          type={inputType}
          required={f.required}
          defaultValue={defaultFor(f.fieldKey)}
          className="mt-1.5"
        />
        {f.helpText && <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : "New lead"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this lead's details."
              : "Capture an inbound interest. You can convert to an opportunity later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map(renderField)}
          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
