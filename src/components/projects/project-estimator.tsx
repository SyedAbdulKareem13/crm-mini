"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Calculator, FileText, Loader2, Sparkles, TrendingUp, Clock3, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ESTIMATOR_FIELDS,
  EMPTY_INPUTS,
  type EstimatorInputs,
  type EstimateResult,
} from "@/lib/estimator";

export type SavedEstimate = {
  inputs: EstimatorInputs;
  result: EstimateResult;
  updatedAt: string;
} | null;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Intelligent Estimator + Costing (PPT slides 6–7): project characteristics →
 *  duration, effort by phase, resource mix and price — persisted on the project. */
export function ProjectEstimator({
  projectId,
  initial,
  canQuote,
}: {
  projectId: string;
  initial: SavedEstimate;
  canQuote: boolean;
}) {
  const [inputs, setInputs] = React.useState<EstimatorInputs>(initial?.inputs ?? EMPTY_INPUTS);
  const [result, setResult] = React.useState<EstimateResult | null>(initial?.result ?? null);
  const [savedAt, setSavedAt] = React.useState<string | null>(initial?.updatedAt ?? null);
  const [running, setRunning] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);
  const [quote, setQuote] = React.useState<{ id: string; quotationNumber: string } | null>(null);

  const setField = (key: keyof EstimatorInputs, raw: string) => {
    const n = raw === "" ? 0 : Math.max(0, Number(raw));
    if (!Number.isFinite(n)) return;
    setInputs((prev) => ({ ...prev, [key]: n }));
  };

  async function run() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Estimate failed");
      setResult(data.result as EstimateResult);
      setSavedAt(new Date().toISOString());
      setQuote(null);
      toast.success("Estimate saved to the project");
    } catch (err: any) {
      toast.error(err?.message || "Estimate failed");
    } finally {
      setRunning(false);
    }
  }

  async function draftQuote() {
    if (drafting) return;
    setDrafting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/quote-from-estimate`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not draft the quotation");
      setQuote(data.quotation);
      toast.success(`Quotation ${data.quotation.quotationNumber} drafted`);
    } catch (err: any) {
      toast.error(err?.message || "Could not draft the quotation");
    } finally {
      setDrafting(false);
    }
  }

  const maxPhaseEffort = result ? Math.max(...result.effortByPhase.map((p) => p.effortPM), 1) : 1;

  return (
    <div className="space-y-6">
      {/* ---------------------- Characteristics grid --------------------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Calculator className="h-4 w-4 text-primary" />
              Project characteristics
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Deterministic model — duration scales the configured roadmap, rates come from your
              manpower rate cards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-[11px] text-muted-foreground">
                Last run {new Date(savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
            <Button variant="gradient" size="sm" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {result ? "Re-estimate" : "Estimate"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ESTIMATOR_FIELDS.map((f) => (
            <div key={f.key}>
              <Label htmlFor={`est-${f.key}`} className="text-[11px] text-muted-foreground">
                {f.label}
              </Label>
              <Input
                id={`est-${f.key}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={inputs[f.key] === 0 ? "" : String(inputs[f.key])}
                placeholder="0"
                onChange={(e) => setField(f.key, e.target.value)}
                className="mt-1 h-8 text-sm tabular-nums"
              />
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------- Results ---------------------------- */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={savedAt ?? "result"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Clock3}
                label="Duration"
                value={`${result.durationWeeks} wk`}
                sub={`≈ ${result.durationMonths} months`}
              />
              <StatCard
                icon={TrendingUp}
                label="Complexity"
                value={`${result.complexity}×`}
                sub="1.0 simple → 3.0 very complex"
              />
              <StatCard
                icon={Users2}
                label="Total effort"
                value={`${result.totalEffortPM} PM`}
                sub="person-months incl. support"
              />
              <StatCard
                icon={FileText}
                label="Customer price"
                value={inr.format(result.totals.customerPrice)}
                sub={`${result.totals.marginPct}% gross margin`}
              />
            </div>

            {/* Effort by phase */}
            <div className="rounded-2xl border bg-card/60 p-4">
              <div className="text-sm font-semibold">Effort by phase</div>
              <div className="mt-3 space-y-2">
                {result.effortByPhase.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 truncate text-xs text-muted-foreground">{p.name}</div>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${Math.max(3, (p.effortPM / maxPhaseEffort) * 100)}%` }}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {p.effortPM} PM · {p.weeks}wk
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource mix + costing (slide 7 style) */}
            <div className="overflow-hidden rounded-2xl border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 text-right font-medium">Count</th>
                      <th className="px-3 py-2 text-right font-medium">Months</th>
                      <th className="px-3 py-2 text-right font-medium">Monthly rate</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.roles.map((r) => (
                      <tr key={r.role} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <span className="font-medium">{r.role}</span>
                          <Badge
                            variant={r.rateSource === "card" ? "success" : "outline"}
                            className="ml-2 text-[9px]"
                          >
                            {r.rateSource === "card" ? "rate card" : "indicative"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.months}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr.format(r.monthlyRate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr.format(r.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr className="border-t bg-muted/20">
                      <td className="px-3 py-1.5 text-muted-foreground" colSpan={4}>Implementation cost</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{inr.format(result.totals.implementationCost)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-muted-foreground" colSpan={4}>Contingency</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{inr.format(result.totals.contingency)}</td>
                    </tr>
                    <tr className="border-t font-semibold">
                      <td className="px-3 py-2" colSpan={4}>Customer price</td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">
                        {inr.format(result.totals.customerPrice)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Assumptions + quote CTA */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <ul className="min-w-0 space-y-1 text-xs text-muted-foreground">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-primary">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <div className="shrink-0">
                {quote ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/quotations/${quote.id}`}>
                      <FileText className="h-3.5 w-3.5" />
                      Open {quote.quotationNumber}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void draftQuote()}
                    disabled={drafting || !canQuote}
                    title={canQuote ? undefined : "The project needs a customer to draft a quotation"}
                  >
                    {drafting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Draft quotation from estimate
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <div className={cn("rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground")}>
          Enter the project characteristics above and run the estimator to get duration, effort by
          phase, resource mix and costing — grounded in your rate cards.
        </div>
      )}
    </div>
  );
}
