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
  CustomFieldsGrid,
  buildCustomData,
  missingRequiredCustom,
  seedCustomValues,
  useModuleConfig,
} from "@/components/config/custom-fields";

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
  const shown = (key: string) => cfg.get(key)?.active ?? true;
  const labelOf = (key: string, fallback: string) => cfg.get(key)?.label ?? fallback;
  const requiredOf = (key: string) => cfg.get(key)?.required ?? false;

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
          <div className="sm:col-span-2">
            <Label htmlFor="name">
              {labelOf("name", "Customer name")}
              <span className="text-destructive"> *</span>
            </Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          {shown("industry") && (
            <div>
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
          )}
          {shown("gstNumber") && (
            <Field name="gstNumber" label={labelOf("gstNumber", "GST number")} required={requiredOf("gstNumber")} />
          )}
          {shown("country") && (
            <Field name="country" label={labelOf("country", "Country")} required={requiredOf("country")} />
          )}
          {shown("region") && (
            <Field name="region" label={labelOf("region", "Region")} required={requiredOf("region")} />
          )}
          {shown("website") && (
            <Field
              name="website"
              label={labelOf("website", "Website")}
              required={requiredOf("website")}
              className="sm:col-span-2"
            />
          )}
          {shown("billingAddress") && (
            <div className="sm:col-span-2">
              <Label htmlFor="billingAddress">
                {labelOf("billingAddress", "Billing address")}
                {requiredOf("billingAddress") && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                id="billingAddress"
                name="billingAddress"
                required={requiredOf("billingAddress")}
                className="mt-1.5"
              />
            </div>
          )}
          {shown("shippingAddress") && (
            <div className="sm:col-span-2">
              <Label htmlFor="shippingAddress">
                {labelOf("shippingAddress", "Shipping address")}
                {requiredOf("shippingAddress") && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                id="shippingAddress"
                name="shippingAddress"
                required={requiredOf("shippingAddress")}
                className="mt-1.5"
              />
            </div>
          )}
          <CustomFieldsGrid
            fields={customFields}
            values={custom}
            onChange={(k, v) => setCustom((prev) => ({ ...prev, [k]: v }))}
            idPrefix="cust-cf"
          />
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
