"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  KeyRound,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { estimateFleet } from "@/lib/position-engine";
import { computeQuotation } from "@/lib/quotation-engine";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

type ManpowerCard = { id: string; designation: string; experience: string; grade: string | null; location: string | null; monthlyRate: number | string; hourlyRate: number | string; dailyRate: number | string; currency: string };
type NonManpowerCard = { id: string; category: string; description: string; unit: string; unitCost: number | string; tax: number | string; marginPct: number | string };
type LicenseCard = { id: string; product: string; edition: string | null; licenseType: string; duration: string; cost: number | string; marginPct: number | string };

type LineItem = {
  itemType: "MANPOWER" | "NON_MANPOWER" | "LICENSE";
  description: string;
  quantity: number;
  uom?: string;
  unitCost: number;
  markupPct: number;
  discountPct: number;
  taxPct: number;
  manpowerGrade?: string;
  manpowerExperience?: string;
  licenseProduct?: string;
  licenseDuration?: string;
};

type Position = {
  designation: string;
  grade?: string;
  experience?: string;
  headcount: number;
  durationMonths: number;
  monthlyRate: number;
  markupPct: number;
};

export function QuotationBuilder({
  customers,
  manpower,
  nonManpower,
  license,
  defaultCustomerId,
  rfq,
}: {
  customers: { id: string; name: string }[];
  manpower: ManpowerCard[];
  nonManpower: NonManpowerCard[];
  license: LicenseCard[];
  defaultCustomerId: string | null;
  rfq: { id: string; rfqNumber: string; customerId: string; opportunityId: string | null; lineItems: { description: string; lineType: string; quantity: number; manpowerGrade: string | null; manpowerExperience: string | null; licenseProduct: string | null }[] } | null;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string>(defaultCustomerId ?? rfq?.customerId ?? "");
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [terms, setTerms] = useState<string>("Net 30. Quotation valid for 30 days. Taxes extra as applicable.");

  const [items, setItems] = useState<LineItem[]>(seedItemsFromRFQ(rfq, manpower, license));
  const [positions, setPositions] = useState<Position[]>(seedPositionsFromRFQ(rfq, manpower));

  const fleet = useMemo(() => estimateFleet(positions), [positions]);
  const totals = useMemo(() => computeQuotation(items.map((i) => ({ unitCost: i.unitCost, quantity: i.quantity, markupPct: i.markupPct, discountPct: i.discountPct, taxPct: i.taxPct }))), [items]);

  const [loading, setLoading] = useState(false);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }
  function addItem(type: LineItem["itemType"]) {
    setItems((p) => [
      ...p,
      {
        itemType: type,
        description: "",
        quantity: 1,
        unitCost: 0,
        markupPct: type === "MANPOWER" ? 35 : type === "LICENSE" ? 15 : 20,
        discountPct: 0,
        taxPct: 18,
      },
    ]);
  }

  function applyManpowerCard(i: number, cardId: string) {
    const card = manpower.find((m) => m.id === cardId);
    if (!card) return;
    updateItem(i, {
      description: `${card.designation} (${card.experience} yrs)`,
      unitCost: Number(card.monthlyRate),
      uom: "month",
      manpowerGrade: card.grade ?? card.designation,
      manpowerExperience: card.experience,
    });
  }
  function applyLicenseCard(i: number, cardId: string) {
    const card = license.find((l) => l.id === cardId);
    if (!card) return;
    updateItem(i, {
      description: `${card.product} ${card.edition ?? ""} — ${card.licenseType}`.trim(),
      unitCost: Number(card.cost),
      uom: card.duration,
      licenseProduct: card.product,
      licenseDuration: card.duration,
      markupPct: Number(card.marginPct) || 15,
    });
  }
  function applyNonManpowerCard(i: number, cardId: string) {
    const card = nonManpower.find((n) => n.id === cardId);
    if (!card) return;
    updateItem(i, {
      description: `${card.category} — ${card.description}`,
      unitCost: Number(card.unitCost),
      uom: card.unit,
      markupPct: Number(card.marginPct) || 20,
      taxPct: Number(card.tax) || 18,
    });
  }

  async function submit() {
    if (!customerId) return toast.error("Pick a customer");
    if (items.length === 0) return toast.error("Add at least one line item");
    setLoading(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          rfqId: rfq?.id,
          opportunityId: rfq?.opportunityId ?? undefined,
          validUntil: validUntil || undefined,
          notes,
          termsAndConditions: terms,
          items,
          positions: fleet.rows.map((r) => ({
            designation: r.designation,
            grade: r.grade,
            experience: r.experience,
            headcount: r.headcount,
            durationMonths: r.durationMonths,
            monthlyRate: r.monthlyRate,
            monthlyBilling: r.monthlyBilling,
            cost: r.cost,
            revenue: r.revenue,
            margin: r.margin,
            marginPct: r.marginPct,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Quotation created");
      router.push(`/app/quotations/${data.quotation.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Quotation details</CardTitle>
            <CardDescription>
              {rfq ? `Generated from RFQ ${rfq.rfqNumber}` : "Standalone quotation"}
            </CardDescription>
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
              <Label>Valid until</Label>
              <DatePicker className="mt-1.5" value={validUntil} onChange={setValidUntil} placeholder="Select validity date" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Terms & Conditions</Label>
              <Textarea className="mt-1.5" value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Line items</CardTitle>
              <CardDescription>Apply rate cards or enter custom unit cost</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addItem("MANPOWER")}>
                <Users className="h-4 w-4" /> Manpower
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addItem("LICENSE")}>
                <KeyRound className="h-4 w-4" /> License
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addItem("NON_MANPOWER")}>
                <BriefcaseBusiness className="h-4 w-4" /> Non-MP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border bg-card/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="soft" className="capitalize">
                      {item.itemType.toLowerCase().replace("_", " ")}
                    </Badge>
                    {item.itemType === "MANPOWER" ? (
                      <Select onValueChange={(v) => applyManpowerCard(i, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Apply manpower rate card…" />
                        </SelectTrigger>
                        <SelectContent>
                          {manpower.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.designation} · {m.experience}y · {formatCompactCurrency(Number(m.monthlyRate))}/mo
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.itemType === "LICENSE" ? (
                      <Select onValueChange={(v) => applyLicenseCard(i, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Apply license rate card…" />
                        </SelectTrigger>
                        <SelectContent>
                          {license.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.product} {l.edition ?? ""} · {l.licenseType} · {formatCompactCurrency(Number(l.cost))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select onValueChange={(v) => applyNonManpowerCard(i, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Apply non-manpower rate card…" />
                        </SelectTrigger>
                        <SelectContent>
                          {nonManpower.map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.category} — {n.description} · {formatCompactCurrency(Number(n.unitCost))}/{n.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-7">
                    <div className="sm:col-span-3">
                      <Label className="text-[10px]">Description</Label>
                      <Input className="mt-1 h-9" value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                    </div>
                    <NumField label="Qty" value={item.quantity} onChange={(v) => updateItem(i, { quantity: v })} />
                    <div>
                      <Label className="text-[10px]">UoM</Label>
                      <Input className="mt-1 h-9" value={item.uom ?? ""} onChange={(e) => updateItem(i, { uom: e.target.value })} />
                    </div>
                    <NumField label="Unit cost" value={item.unitCost} onChange={(v) => updateItem(i, { unitCost: v })} />
                    <NumField label="Markup %" value={item.markupPct} onChange={(v) => updateItem(i, { markupPct: v })} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
                    <NumField label="Discount %" value={item.discountPct} onChange={(v) => updateItem(i, { discountPct: v })} />
                    <NumField label="Tax %" value={item.taxPct} onChange={(v) => updateItem(i, { taxPct: v })} />
                    <div className="sm:col-span-5 self-end text-right text-sm">
                      <span className="text-muted-foreground">Line total:&nbsp;</span>
                      <span className="font-semibold">
                        {formatCurrency(lineTotal(item))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                Add a line by clicking one of the buttons above.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Position determination engine</CardTitle>
            <CardDescription>Resource estimation with cost, revenue, margin & profit</CardDescription>
          </CardHeader>
          <CardContent>
            <PositionEngine
              positions={positions}
              setPositions={setPositions}
              manpower={manpower}
              fleet={fleet}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Quotation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Base cost" value={formatCurrency(totals.baseCost)} />
            <Row label="Markup" value={formatCurrency(totals.markupAmount)} positive />
            <Row label="Discount" value={`-${formatCurrency(totals.discountAmount)}`} />
            <Row label="Tax" value={formatCurrency(totals.taxAmount)} />
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Grand total</span>
              <span className="font-display text-xl font-semibold">{formatCurrency(totals.grandTotal)}</span>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-success/15 to-success/0 p-3">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-success">{formatCurrency(totals.profitAmount)}</span>
                <span className="text-xs text-success">{totals.marginPct.toFixed(1)}% margin</span>
              </div>
              <Progress value={Math.min(100, Math.max(0, totals.marginPct))} className="mt-2" />
            </div>
            <Button onClick={submit} disabled={loading} variant="gradient" size="lg" className="w-full">
              <Sparkles className="h-4 w-4" />
              {loading ? "Saving…" : "Create quotation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PositionEngine({
  positions,
  setPositions,
  manpower,
  fleet,
}: {
  positions: Position[];
  setPositions: (p: Position[]) => void;
  manpower: ManpowerCard[];
  fleet: ReturnType<typeof estimateFleet>;
}) {
  function update(i: number, patch: Partial<Position>) {
    setPositions(positions.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setPositions(positions.filter((_, idx) => idx !== i));
  }
  function apply(i: number, id: string) {
    const card = manpower.find((m) => m.id === id);
    if (!card) return;
    update(i, {
      designation: card.designation,
      grade: card.grade ?? card.designation,
      experience: card.experience,
      monthlyRate: Number(card.monthlyRate),
    });
  }

  return (
    <div className="space-y-3">
      {positions.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border bg-card/60 p-3 sm:grid-cols-8">
          <div className="sm:col-span-2">
            <Label className="text-[10px]">Apply rate card</Label>
            <Select onValueChange={(v) => apply(i, v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Pick…" /></SelectTrigger>
              <SelectContent>
                {manpower.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.designation} · {m.experience}y</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10px]">Designation</Label>
            <Input className="mt-1 h-9" value={p.designation} onChange={(e) => update(i, { designation: e.target.value })} />
          </div>
          <NumField label="HC" value={p.headcount} onChange={(v) => update(i, { headcount: v })} />
          <NumField label="Months" value={p.durationMonths} onChange={(v) => update(i, { durationMonths: v })} />
          <NumField label="Cost/mo" value={p.monthlyRate} onChange={(v) => update(i, { monthlyRate: v })} />
          <NumField label="Markup %" value={p.markupPct} onChange={(v) => update(i, { markupPct: v })} />
          <div className="sm:col-span-8 flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setPositions([
            ...positions,
            { designation: "Senior Developer", grade: "Senior", experience: "6-10", headcount: 1, durationMonths: 6, monthlyRate: 180000, markupPct: 35 },
          ])
        }
      >
        <Plus className="h-4 w-4" /> Add position
      </Button>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric tone="info" label="Headcount" value={fleet.totals.headcount} />
        <Metric label="Cost" value={formatCompactCurrency(fleet.totals.cost)} />
        <Metric tone="success" label="Revenue" value={formatCompactCurrency(fleet.totals.revenue)} />
        <Metric tone="primary" label="Margin" value={`${formatCompactCurrency(fleet.totals.margin)} (${fleet.totals.marginPct.toFixed(1)}%)`} />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: any; tone?: "info" | "success" | "primary" }) {
  const cls =
    tone === "info"
      ? "from-info/15 to-info/0 text-info"
      : tone === "success"
      ? "from-success/15 to-success/0 text-success"
      : tone === "primary"
      ? "from-primary/15 to-primary/0 text-primary"
      : "from-muted to-muted/0 text-foreground";
  return (
    <div className={`rounded-xl bg-gradient-to-br ${cls} p-3`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label className="text-[10px]">{label}</Label>
      <Input
        className="mt-1 h-9"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${positive ? "text-success" : ""}`}>{value}</span>
    </div>
  );
}

function lineTotal(i: LineItem) {
  const base = i.unitCost * i.quantity;
  const afterMarkup = base * (1 + i.markupPct / 100);
  const afterDiscount = afterMarkup * (1 - i.discountPct / 100);
  return afterDiscount * (1 + i.taxPct / 100);
}

function seedItemsFromRFQ(
  rfq: { lineItems: { description: string; lineType: string; quantity: number; manpowerGrade: string | null; manpowerExperience: string | null; licenseProduct: string | null }[] } | null,
  manpower: ManpowerCard[],
  license: LicenseCard[]
): LineItem[] {
  if (!rfq) {
    return [];
  }
  return rfq.lineItems.map((l) => {
    if (l.lineType === "MANPOWER") {
      const match = manpower.find(
        (m) =>
          (l.manpowerGrade && m.designation.toLowerCase().includes(l.manpowerGrade.toLowerCase())) ||
          (l.manpowerExperience && m.experience === l.manpowerExperience)
      );
      return {
        itemType: "MANPOWER" as const,
        description: l.description,
        quantity: Number(l.quantity) || 1,
        unitCost: Number(match?.monthlyRate ?? 0),
        markupPct: 35,
        discountPct: 0,
        taxPct: 18,
        uom: "month",
        manpowerGrade: l.manpowerGrade ?? undefined,
        manpowerExperience: l.manpowerExperience ?? undefined,
      };
    }
    if (l.lineType === "SOFTWARE_LICENSE") {
      const match = license.find(
        (lic) => l.licenseProduct && lic.product.toLowerCase().includes(l.licenseProduct.toLowerCase())
      );
      return {
        itemType: "LICENSE" as const,
        description: l.description,
        quantity: Number(l.quantity) || 1,
        unitCost: Number(match?.cost ?? 0),
        markupPct: Number(match?.marginPct ?? 15),
        discountPct: 0,
        taxPct: 18,
        licenseProduct: l.licenseProduct ?? undefined,
        licenseDuration: match?.duration,
      };
    }
    return {
      itemType: "NON_MANPOWER" as const,
      description: l.description,
      quantity: Number(l.quantity) || 1,
      unitCost: 0,
      markupPct: 20,
      discountPct: 0,
      taxPct: 18,
    };
  });
}

function seedPositionsFromRFQ(
  rfq: { lineItems: { description: string; lineType: string; quantity: number; manpowerGrade: string | null; manpowerExperience: string | null }[] } | null,
  manpower: ManpowerCard[]
): Position[] {
  if (!rfq) return [];
  return rfq.lineItems
    .filter((l) => l.lineType === "MANPOWER")
    .map((l) => {
      const match = manpower.find(
        (m) =>
          (l.manpowerGrade && m.designation.toLowerCase().includes(l.manpowerGrade.toLowerCase())) ||
          (l.manpowerExperience && m.experience === l.manpowerExperience)
      );
      return {
        designation: l.manpowerGrade ?? l.description,
        grade: l.manpowerGrade ?? undefined,
        experience: l.manpowerExperience ?? undefined,
        headcount: Number(l.quantity) || 1,
        durationMonths: 6,
        monthlyRate: Number(match?.monthlyRate ?? 150000),
        markupPct: 35,
      };
    });
}
