"use client";

import { useState } from "react";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.source = source;
    if (industry) payload.industry = industry;
    if (isEdit) payload.status = status;

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
          <Field name="name" label="Lead name" required defaultValue={lead?.name} />
          <Field name="company" label="Company" required defaultValue={lead?.company} />
          <Field name="contactPerson" label="Contact person" defaultValue={lead?.contactPerson ?? ""} />
          <Field name="email" label="Email" type="email" defaultValue={lead?.email ?? ""} />
          <Field name="mobile" label="Mobile" defaultValue={lead?.mobile ?? ""} />
          <Field
            name="expectedRevenue"
            label="Expected revenue (₹)"
            type="number"
            defaultValue={lead?.expectedRevenue != null ? String(Number(lead.expectedRevenue)) : ""}
          />
          <div>
            <Label>Source</Label>
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
          </div>
          <div>
            <Label>Industry</Label>
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
          {isEdit ? (
            <div>
              <Label>Status</Label>
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
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={lead?.notes ?? ""} className="mt-1.5" />
          </div>
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

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1.5" />
    </div>
  );
}
