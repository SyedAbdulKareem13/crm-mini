"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Shared plumbing for admin-configurable fields on module forms
 * (Leads / Opportunities / Customers …). The Admin → Configuration studio
 * defines the fields; these helpers fetch, render and collect their values.
 */

export type ConfigField = {
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
  appliesTo: string[] | null;
  helpText: string | null;
};

/** Fetch a module's field configuration whenever the form opens. */
export function useModuleConfig(module: string, open: boolean) {
  const [fields, setFields] = React.useState<ConfigField[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch(`/api/admin/field-config?module=${module}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.fields) {
          setFields(
            [...(data.fields as ConfigField[])].sort((a, b) => a.position - b.position)
          );
          setLoaded(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [module, open]);

  const customFields = React.useMemo(
    () => fields.filter((f) => f.active && f.isCustom),
    [fields]
  );

  return { fields, customFields, loaded };
}

/** Seed input state from a record's stored custom data. */
export function seedCustomValues(
  customFields: ConfigField[],
  data: Record<string, unknown> | null | undefined
): Record<string, string> {
  const seed: Record<string, string> = {};
  for (const f of customFields) {
    const v = data?.[f.fieldKey];
    seed[f.fieldKey] = v === null || v === undefined ? "" : String(v);
  }
  return seed;
}

/** Build the `data` payload: every rendered key is included ("" clears it server-side). */
export function buildCustomData(
  customFields: ConfigField[],
  values: Record<string, string>
): Record<string, unknown> | undefined {
  if (customFields.length === 0) return undefined;
  const out: Record<string, unknown> = {};
  for (const f of customFields) out[f.fieldKey] = values[f.fieldKey] ?? "";
  return out;
}

/** First required custom field without a value, if any. */
export function missingRequiredCustom(
  customFields: ConfigField[],
  values: Record<string, string>
): ConfigField | undefined {
  return customFields.find((f) => f.required && !(values[f.fieldKey] ?? "").trim());
}

function inputTypeFor(fieldType: string): string {
  switch (fieldType) {
    case "email": return "email";
    case "phone": return "tel";
    case "number":
    case "currency": return "number";
    case "date": return "date";
    default: return "text";
  }
}

/** Renders the module's active custom fields as a two-column grid (animated). */
export function CustomFieldsGrid({
  fields,
  values,
  onChange,
  idPrefix,
}: {
  fields: ConfigField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  idPrefix: string;
}) {
  if (fields.length === 0) return null;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.fieldKey}`;
        const isTextarea = f.fieldType === "textarea";
        const isSelect = f.fieldType === "select" && f.options && f.options.length > 0;
        return (
          <motion.div
            key={f.id}
            layout
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.25, 1] }}
            className={isTextarea ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={id}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>
            {isSelect ? (
              <Select
                value={values[f.fieldKey] ?? ""}
                onValueChange={(v) => onChange(f.fieldKey, v)}
              >
                <SelectTrigger id={id} className="mt-1.5">
                  <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {f.options!.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isTextarea ? (
              <Textarea
                id={id}
                value={values[f.fieldKey] ?? ""}
                onChange={(e) => onChange(f.fieldKey, e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            ) : (
              <Input
                id={id}
                type={inputTypeFor(f.fieldType)}
                value={values[f.fieldKey] ?? ""}
                onChange={(e) => onChange(f.fieldKey, e.target.value)}
                className="mt-1.5"
              />
            )}
            {f.helpText && (
              <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
