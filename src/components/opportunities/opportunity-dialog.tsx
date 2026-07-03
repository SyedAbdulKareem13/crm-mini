"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { OPP_STAGES } from "@/lib/constants";
import {
  CustomFieldsGrid,
  buildCustomData,
  missingRequiredCustom,
  seedCustomValues,
  useModuleConfig,
} from "@/components/config/custom-fields";

type Customer = { id: string; name: string };

export type OppForEdit = {
  id: string;
  name: string;
  customerId: string;
  expectedRevenue: string | number;
  probability: number;
  expectedCloseDate: string | null;
  stage: string;
  notes: string | null;
  data?: Record<string, unknown> | null;
};

export function OpportunityDialog({
  open,
  onOpenChange,
  customers,
  opportunity,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: Customer[];
  opportunity?: OppForEdit | null;
  onSaved?: (o: any) => void;
}) {
  const router = useRouter();
  const isEdit = !!opportunity;
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(opportunity?.customerId ?? "");
  const [stage, setStage] = useState(opportunity?.stage ?? "QUALIFICATION");
  const [custom, setCustom] = useState<Record<string, string>>({});

  // Live OPPORTUNITY field configuration (label / active / required + custom fields).
  const { fields, customFields } = useModuleConfig("OPPORTUNITY", open);

  const cfg = useMemo(() => {
    const m = new Map<string, (typeof fields)[number]>();
    for (const f of fields) m.set(f.fieldKey, f);
    return m;
  }, [fields]);

  /** Config lookups with safe fallbacks (config not yet loaded = show everything). */
  const shown = (key: string) => {
    const f = cfg.get(key);
    return f ? f.active : true;
  };
  const labelOf = (key: string, fallback: string) => cfg.get(key)?.label ?? fallback;
  const requiredOf = (key: string, fallback = false) => cfg.get(key)?.required ?? fallback;

  useEffect(() => {
    if (!open) return;
    setCustom(seedCustomValues(customFields, opportunity?.data ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunity, customFields.length]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Pick a customer");
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(form.get("name") ?? ""),
      customerId,
      expectedRevenue: Number(form.get("expectedRevenue") ?? 0) || 0,
      probability: Number(form.get("probability") ?? 20) || 0,
      stage,
      notes: String(form.get("notes") ?? "") || undefined,
    };
    const close = String(form.get("expectedCloseDate") ?? "");
    if (close) payload.expectedCloseDate = close;

    // Configured `required` on core fields rendered without native validation.
    if (requiredOf("expectedCloseDate") && !close) {
      toast.error(`${labelOf("expectedCloseDate", "Expected close date")} is required`);
      return;
    }
    if (requiredOf("notes") && !String(form.get("notes") ?? "").trim()) {
      toast.error(`${labelOf("notes", "Notes")} is required`);
      return;
    }
    const missingCustom = missingRequiredCustom(customFields, custom);
    if (missingCustom) {
      toast.error(`${missingCustom.label} is required`);
      return;
    }

    // Admin-defined custom field values → Opportunity.data (server merges per key).
    const customData = buildCustomData(customFields, custom);
    if (customData) payload.data = customData;

    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/opportunities/${opportunity!.id}` : "/api/opportunities",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(isEdit ? "Opportunity updated" : "Opportunity created");
      onOpenChange(false);
      onSaved?.(data.opportunity);
      if (isEdit) router.refresh();
      else router.push(`/app/opportunities/${data.opportunity.id}`);
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
          <DialogTitle>{isEdit ? "Edit opportunity" : "New opportunity"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the deal details."
              : "Create a deal and drive it through the pipeline."}
          </DialogDescription>
        </DialogHeader>

        {customers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            You need a customer first — convert a qualified lead or add a customer, then create the opportunity.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">
                {labelOf("title", "Opportunity name")}
                <span className="text-destructive"> *</span>
              </Label>
              <Input id="name" name="name" required defaultValue={opportunity?.name ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>
                {labelOf("customerId", "Customer")}
                <span className="text-destructive"> *</span>
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {shown("stage") && (
              <div>
                <Label>{labelOf("stage", "Stage")}</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPP_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {shown("expectedRevenue") && (
              <div>
                <Label htmlFor="expectedRevenue">
                  {labelOf("expectedRevenue", "Expected revenue (₹)")}
                  {requiredOf("expectedRevenue") && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="expectedRevenue"
                  name="expectedRevenue"
                  type="number"
                  required={requiredOf("expectedRevenue")}
                  defaultValue={opportunity ? Number(opportunity.expectedRevenue) : ""}
                  className="mt-1.5"
                />
              </div>
            )}
            {shown("probability") && (
              <div>
                <Label htmlFor="probability">
                  {labelOf("probability", "Probability %")}
                </Label>
                <Input
                  id="probability"
                  name="probability"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={opportunity?.probability ?? 20}
                  className="mt-1.5"
                />
              </div>
            )}
            {shown("expectedCloseDate") && (
              <div className="sm:col-span-2">
                <Label>
                  {labelOf("expectedCloseDate", "Expected close date")}
                  {requiredOf("expectedCloseDate") && <span className="text-destructive"> *</span>}
                </Label>
                <div className="mt-1.5">
                  <DatePicker
                    name="expectedCloseDate"
                    defaultValue={opportunity?.expectedCloseDate ? opportunity.expectedCloseDate.slice(0, 10) : ""}
                    placeholder="Select close date"
                  />
                </div>
              </div>
            )}
            {shown("notes") && (
              <div className="sm:col-span-2">
                <Label htmlFor="notes">
                  {labelOf("notes", "Notes")}
                  {requiredOf("notes") && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea id="notes" name="notes" defaultValue={opportunity?.notes ?? ""} className="mt-1.5" />
              </div>
            )}
            <CustomFieldsGrid
              fields={customFields}
              values={custom}
              onChange={(k, v) => setCustom((prev) => ({ ...prev, [k]: v }))}
              idPrefix="opp-cf"
            />
            <DialogFooter className="sm:col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={loading}>
                {loading ? "Saving…" : isEdit ? "Save changes" : "Create opportunity"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
