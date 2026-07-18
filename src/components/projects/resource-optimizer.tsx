"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Globe2, Loader2, Plus, Users2, Scale, ShieldCheck, TrendingUp, Library, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { optimizeResources, DELIVERABLE_LIBRARY } from "@/lib/resource-optimizer";
import type { SavedEstimate } from "./project-estimator";
import type { PlannerPhase } from "./project-planner";

const BUCKET_META: Record<string, { label: string; cls: string }> = {
  management: { label: "PM/PMO", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  functional: { label: "Functional", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  technical: { label: "Technical", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  qa: { label: "QA", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

/** Resource Optimizer (PPT slide 9) — staffing recommendations derived from
 *  the saved estimate, plus the reusable deliverable library. */
export function ResourceOptimizer({
  estimate,
  phases,
  onAddToPhase,
}: {
  estimate: SavedEstimate;
  phases: PlannerPhase[];
  onAddToPhase: (phase: PlannerPhase, name: string) => Promise<boolean>;
}) {
  const [gcc, setGcc] = React.useState(false);
  const [adding, setAdding] = React.useState<string | null>(null);

  const plan = React.useMemo(
    () => (estimate ? optimizeResources(estimate.inputs, estimate.result, { gccRegion: gcc }) : null),
    [estimate, gcc]
  );

  const existingNames = React.useMemo(
    () => new Set(phases.flatMap((p) => p.deliverables.map((d) => d.name.toLowerCase()))),
    [phases]
  );

  async function addLibraryItem(item: (typeof DELIVERABLE_LIBRARY)[number]) {
    const phase =
      phases.find((p) => p.name.toLowerCase() === item.phase.toLowerCase()) ?? phases[0];
    if (!phase) return toast.error("The project has no phases to add to");
    setAdding(item.name);
    try {
      const ok = await onAddToPhase(phase, item.name);
      if (ok) toast.success(`“${item.name}” added to ${phase.name}`);
    } finally {
      setAdding(null);
    }
  }

  if (!plan || !estimate) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        The Resource Optimizer works from the saved estimate — switch to the{" "}
        <span className="font-medium text-foreground">Estimator</span> view and run an estimate first.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Header + GCC toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Users2 className="h-4 w-4 text-primary" />
            Resource Optimizer
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Staffing plan derived from the estimate — {plan.totalConsultants} consultants,{" "}
            {plan.totalFteMonths} FTE-months.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">GCC / Arabic-speaking region</span>
          <Switch checked={gcc} onCheckedChange={setGcc} />
        </label>
      </div>

      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Users2 className="h-3.5 w-3.5" /> Consultants
          </div>
          <div className="mt-1 font-display text-xl font-semibold tabular-nums">{plan.totalConsultants}</div>
          <div className="text-[11px] text-muted-foreground">{plan.totalFteMonths} FTE-months total</div>
        </div>
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Onsite / Offshore
          </div>
          <div className="mt-1 font-display text-xl font-semibold tabular-nums">
            {plan.onsitePct}% <span className="text-muted-foreground">/</span> {plan.offshorePct}%
          </div>
          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary/80" style={{ width: `${plan.onsitePct}%` }} />
            <div className="bg-primary/30" style={{ width: `${plan.offshorePct}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Scale className="h-3.5 w-3.5" /> Functional : Technical
          </div>
          <div className="mt-1 font-display text-xl font-semibold tabular-nums">{plan.ratioLabel}</div>
          <div className="text-[11px] text-muted-foreground">
            {plan.functionalFteMonths} vs {plan.technicalFteMonths} FTE-months
          </div>
        </div>
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> PMO &amp; QA
          </div>
          <div className="mt-1 font-display text-xl font-semibold">
            {plan.pmo.required ? "PMO + " : ""}
            {plan.qa.count} QA
          </div>
          <div className="text-[11px] text-muted-foreground">{plan.pmo.required ? "PMO analyst recommended" : "PM covers PMO"}</div>
        </div>
      </div>

      {/* Role mix table */}
      <div className="overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Track</th>
                <th className="px-3 py-2 text-right font-medium">Count</th>
                <th className="px-3 py-2 text-right font-medium">Months</th>
                <th className="px-3 py-2 text-right font-medium">Onsite</th>
                <th className="px-3 py-2 text-right font-medium">Offshore</th>
              </tr>
            </thead>
            <tbody>
              {plan.roles.map((r) => {
                const meta = BUCKET_META[r.bucket];
                return (
                  <tr key={r.role} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{r.role}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.cls)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.months}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.onsite}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.offshore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Peak staffing */}
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Peak staffing periods
          </div>
          <div className="mt-3 space-y-2">
            {plan.phases.map((p) => {
              const max = Math.max(...plan.phases.map((x) => x.headcount), 1);
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 truncate text-xs text-muted-foreground">{p.name}</div>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", p.isPeak ? "bg-primary" : "bg-primary/40")}
                      style={{ width: `${Math.max(4, (p.headcount / max) * 100)}%` }}
                    />
                  </div>
                  <div className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    ~{p.headcount} FTE
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{plan.peakLabel}</p>
        </div>

        {/* GCC + advisory notes */}
        <div className="rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Globe2 className="h-4 w-4 text-primary" /> Localization &amp; advisory
          </div>
          {plan.gcc ? (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="success">{plan.gcc.arabicFunctional} Arabic-speaking functional</Badge>
                <Badge variant="soft">{plan.gcc.localLead} local engagement lead</Badge>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                {plan.gcc.notes.map((n, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-primary">•</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Toggle <span className="font-medium text-foreground">GCC / Arabic-speaking region</span> to add
              Arabic consultant and localization recommendations.
            </p>
          )}
          <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
            {plan.notes.map((n, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-primary">•</span>
                {n}
              </li>
            ))}
            <li className="flex gap-1.5">
              <span className="text-primary">•</span>
              {plan.pmo.reason}
            </li>
            <li className="flex gap-1.5">
              <span className="text-primary">•</span>
              {plan.qa.note}
            </li>
          </ul>
        </div>
      </div>

      {/* Deliverable library */}
      <div className="rounded-2xl border bg-card/60 p-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Library className="h-4 w-4 text-primary" /> Deliverable library
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reusable delivery artifacts — one click adds them as tasks to their natural phase.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DELIVERABLE_LIBRARY.map((item) => {
            const added = existingNames.has(item.name.toLowerCase());
            return (
              <div key={item.name} className="flex items-start justify-between gap-2 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{item.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.blurb}</div>
                  <Badge variant="outline" className="mt-1.5 text-[9px] font-normal">
                    {item.phase}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant={added ? "ghost" : "outline"}
                  className="h-7 w-7 shrink-0"
                  disabled={added || adding === item.name}
                  onClick={() => void addLibraryItem(item)}
                  aria-label={added ? `${item.name} already in plan` : `Add ${item.name}`}
                  title={added ? "Already in the plan" : `Add to ${item.phase}`}
                >
                  {adding === item.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : added ? (
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
