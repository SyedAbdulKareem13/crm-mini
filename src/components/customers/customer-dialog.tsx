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
import { INDUSTRIES } from "@/lib/constants";
import {
  CustomFieldItem,
  buildCustomData,
  missingRequiredCustom,
  seedCustomValues,
  useModuleConfig,
} from "@/components/config/custom-fields";

/** Core Customer form keys (config `position` fully drives the order). */
const CORE_ORDER = [
  "name",
  "industry",
  "gstNumber",
  "country",
  "region",
  "website",
  "billingAddress",
  "shippingAddress",
];

export function CustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (customer: any) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});

  // Live CUSTOMER field configuration (label / active / required + custom fields).
  const { fields, customFields } = useModuleConfig("CUSTOMER", open);
  const cfg = new Map(fields.map((f) => [f.fieldKey, f]));
  const labelOf = (key: string, fallback: string) => cfg.get(key)?.label ?? fallback;
  const requiredOf = (key: string) => cfg.get(key)?.required ?? false;

  // One position-ordered flow of core + custom fields (fallback until config loads).
  const ordered =
    fields.length === 0
      ? CORE_ORDER.map((key) => ({ key, custom: null as null | (typeof customFields)[number] }))
      : fields
          .filter((f) => f.active && (f.isCustom || CORE_ORDER.includes(f.fieldKey)))
          .sort((a, b) => a.position - b.position)
          .map((f) => ({ key: f.fieldKey, custom: f.isCustom ? f : null }));

  useEffect(() => {
    if (!open) return;
    setCustom(seedCustomValues(customFields, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customFields.length]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    if (industry) payload.industry = industry;

    if (requiredOf("industry") && !industry) {
      toast.error(`${labelOf("industry", "Industry")} is required`);
      return;
    }
    const missingCustom = missingRequiredCustom(customFields, custom);
    if (missingCustom) {
      toast.error(`${missingCustom.label} is required`);
      return;
    }
    const customData = buildCustomData(customFields, custom);
    if (customData) payload.data = customData;

    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Customer created");
      onOpenChange(false);
      onCreated?.(data.customer);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Add a customer master record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ordered.map(({ key, custom: cf }) => {
            if (cf) {
              return (
                <CustomFieldItem
                  key={cf.id}
                  field={cf}
                  value={custom[cf.fieldKey] ?? ""}
                  onChange={(v) => setCustom((prev) => ({ ...prev, [cf.fieldKey]: v }))}
                  idPrefix="cust-cf"
                />
              );
            }
            switch (key) {
              case "name":
                return (
                  <div key={key} className="sm:col-span-2">
                    <Label htmlFor="name">
                      {labelOf("name", "Customer name")}
                      <span className="text-destructive"> *</span>
                    </Label>
                    <Input id="name" name="name" required className="mt-1.5" />
                  </div>
                );
              case "industry":
                return (
                  <div key={key}>
                    <Label>
                      {labelOf("industry", "Industry")}
                      {requiredOf("industry") && <span className="text-destructive"> *</span>}
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
                  </div>
                );
              case "gstNumber":
              case "country":
              case "region":
                return (
                  <Field
                    key={key}
                    name={key}
                    label={labelOf(key, key === "gstNumber" ? "GST number" : key.charAt(0).toUpperCase() + key.slice(1))}
                    required={requiredOf(key)}
                  />
                );
              case "website":
                return (
                  <Field
                    key={key}
                    name="website"
                    label={labelOf("website", "Website")}
                    required={requiredOf("website")}
                    className="sm:col-span-2"
                  />
                );
              case "billingAddress":
              case "shippingAddress":
                return (
                  <div key={key} className="sm:col-span-2">
                    <Label htmlFor={key}>
                      {labelOf(key, key === "billingAddress" ? "Billing address" : "Shipping address")}
                      {requiredOf(key) && <span className="text-destructive"> *</span>}
                    </Label>
                    <Textarea id={key} name={key} required={requiredOf(key)} className="mt-1.5" />
                  </div>
                );
              default:
                return null;
            }
          })}
          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Creating…" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  required,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input id={name} name={name} required={required} className="mt-1.5" />
    </div>
  );
}
