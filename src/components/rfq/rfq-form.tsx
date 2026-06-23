"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

type LineItem = {
  lineType: string;
  description: string;
  quantity: number;
  uom?: string;
  manpowerGrade?: string;
  manpowerExperience?: string;
  licenseProduct?: string;
  notes?: string;
};

const LINE_TYPES = [
  { value: "MANPOWER", label: "Manpower" },
  { value: "NON_MANPOWER", label: "Non-Manpower" },
  { value: "SOFTWARE_LICENSE", label: "Software License" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "SERVICE", label: "Service" },
];

export function RfqForm({
  customers,
  opportunities,
  defaultOpportunityId,
}: {
  customers: { id: string; name: string }[];
  opportunities: { id: string; name: string; oppNumber: string; customerId: string }[];
  defaultOpportunityId: string | null;
}) {
  const router = useRouter();
  const defaultOpp = opportunities.find((o) => o.id === defaultOpportunityId) ?? null;
  const [customerId, setCustomerId] = useState<string>(defaultOpp?.customerId ?? "");
  const [opportunityId, setOpportunityId] = useState<string>(defaultOpportunityId ?? "");
  const [items, setItems] = useState<LineItem[]>([
    { lineType: "MANPOWER", description: "Senior Developer", quantity: 2, uom: "month", manpowerGrade: "Senior", manpowerExperience: "6-10" },
  ]);
  const [dueDate, setDueDate] = useState<string>("");
  const [currency, setCurrency] = useState("INR");
  const [terms, setTerms] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  function update(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function add() {
    setItems((prev) => [
      ...prev,
      { lineType: "MANPOWER", description: "", quantity: 1, uom: "month" },
    ]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return toast.error("Pick a customer");
    if (items.length === 0) return toast.error("Add at least one line item");
    setLoading(true);
    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          opportunityId: opportunityId || undefined,
          dueDate: dueDate || undefined,
          currency,
          terms,
          remarks,
          lineItems: items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("RFQ created");
      router.push(`/app/rfqs/${data.rfq.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>RFQ details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opportunity</Label>
            <Select
              value={opportunityId}
              onValueChange={(v) => {
                setOpportunityId(v);
                const opp = opportunities.find((o) => o.id === v);
                if (opp) setCustomerId(opp.customerId);
              }}
            >
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="(Optional) link opportunity" /></SelectTrigger>
              <SelectContent>
                {opportunities.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.oppNumber} · {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due date</Label>
            <DatePicker className="mt-1.5" value={dueDate} onChange={setDueDate} placeholder="Select due date" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["INR", "USD", "EUR", "GBP", "AED"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Terms</Label>
            <Textarea className="mt-1.5" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms, validity, etc." />
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea className="mt-1.5" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Row label="Lines" value={String(items.length)} />
            <Row label="Currency" value={currency} />
            <Row label="Customer" value={customers.find((c) => c.id === customerId)?.name ?? "—"} />
          </div>
          <Button type="submit" variant="gradient" size="lg" className="mt-6 w-full" disabled={loading}>
            {loading ? "Creating…" : "Create RFQ"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-3 rounded-xl border bg-card/60 p-3 sm:grid-cols-7"
            >
              <div className="sm:col-span-2">
                <Label>Type</Label>
                <Select value={item.lineType} onValueChange={(v) => update(i, { lineType: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LINE_TYPES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label>Description</Label>
                <Input className="mt-1.5" value={item.description} onChange={(e) => update(i, { description: e.target.value })} />
              </div>
              <div>
                <Label>Qty</Label>
                <Input className="mt-1.5" type="number" value={item.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>UoM</Label>
                <Input className="mt-1.5" value={item.uom ?? ""} onChange={(e) => update(i, { uom: e.target.value })} />
              </div>
              {item.lineType === "MANPOWER" ? (
                <>
                  <div>
                    <Label>Grade</Label>
                    <Input className="mt-1.5" value={item.manpowerGrade ?? ""} onChange={(e) => update(i, { manpowerGrade: e.target.value })} />
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <Input className="mt-1.5" value={item.manpowerExperience ?? ""} onChange={(e) => update(i, { manpowerExperience: e.target.value })} />
                  </div>
                </>
              ) : null}
              {item.lineType === "SOFTWARE_LICENSE" ? (
                <div className="sm:col-span-2">
                  <Label>License product</Label>
                  <Input className="mt-1.5" value={item.licenseProduct ?? ""} onChange={(e) => update(i, { licenseProduct: e.target.value })} />
                </div>
              ) : null}
              <div className="sm:col-span-7 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
