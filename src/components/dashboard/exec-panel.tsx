"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Gauge,
  HeartPulse,
  Percent,
  Ruler,
  TrendingUp,
  Users2,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HEALTH_META, type ProjectHealth } from "@/lib/project-health";
import type { ExecDashboardData } from "@/lib/exec-dashboard";
import { useI18n } from "@/components/i18n/provider";

const HEALTH_COLOR: Record<ProjectHealth, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  DELAYED: "bg-destructive",
  ON_HOLD: "bg-slate-400",
  COMPLETED: "bg-primary/60",
};

/** Project-health enum value → i18n key (label resolved via tx with the
 *  HEALTH_META English label as the fallback). */
const HEALTH_KEY: Record<ProjectHealth, string> = {
  ON_TRACK: "dashboard.health.onTrack",
  AT_RISK: "dashboard.health.atRisk",
  DELAYED: "dashboard.health.delayed",
  ON_HOLD: "dashboard.health.onHold",
  COMPLETED: "dashboard.health.completed",
};

function Widget({
  icon: Icon,
  title,
  href,
  hrefLabel,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("luxury-card flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {hrefLabel} <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-xs text-muted-foreground">{children}</p>;
}

/** Executive Dashboard (PPT slide 11) — the eight leadership widgets.
 *  Every number reuses the source of truth of its feature page. */
export function ExecPanel({ data }: { data: ExecDashboardData }) {
  const { tx, ts, secondary, formatNumber } = useI18n();
  const inr = (n: number) =>
    formatNumber(n, { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
  const pct = (n: number) => formatNumber(n / 100, { style: "percent", maximumFractionDigits: 1 });

  const maxPipeline = Math.max(...data.pipelineByProduct.map((p) => p.value), 1);
  const maxForecast = Math.max(...data.forecastByMonth.map((m) => m.weighted), 1);
  const healthTotal = data.projectHealth.reduce((n, h) => n + h.count, 0);

  // Beside-heading secondary script (Urdu/Arabic) — only when a secondary is
  // chosen; follows the user's selection instead of the old hardcoded Urdu.
  const execSecondary = ts("dashboard.exec.title");
  const secDir = secondary === "ur" || secondary === "ar" ? "rtl" : "ltr";
  const secFont = secondary === "ur" ? "font-urdu" : "font-arabic";

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
            {tx("dashboard.exec.title", "Executive Dashboard")}
            {execSecondary ? (
              <span dir={secDir} className={cn("text-sm text-muted-foreground", secFont)}>
                {execSecondary}
              </span>
            ) : null}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tx("dashboard.exec.subtitle", "Presales & delivery leadership — live from pipeline, quotations and project data.")}
          </p>
        </div>
      </div>

      <div className="mz-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1 · Pipeline by SAP product */}
        <Widget
          icon={Boxes}
          title={tx("dashboard.exec.pipelineByProduct.title", "Pipeline by SAP Product")}
          href="/app/pipeline"
          hrefLabel={tx("dashboard.exec.link.pipeline", "Pipeline")}
        >
          {data.pipelineByProduct.length === 0 ? (
            <Empty>{tx("dashboard.exec.pipelineByProduct.empty", "No open opportunities yet.")}</Empty>
          ) : (
            <div className="space-y-2">
              {data.pipelineByProduct.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatNumber(p.count)} · {inr(p.value)}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.max(4, (p.value / maxPipeline) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-[10px] text-muted-foreground">
                {tx("dashboard.exec.pipelineByProduct.footnote", "Product = the transformation type of the opportunity's project; convert opportunities to classify them.")}
              </p>
            </div>
          )}
        </Widget>

        {/* 2 · Revenue forecast */}
        <Widget
          icon={TrendingUp}
          title={tx("dashboard.exec.forecast.title", "Revenue Forecast")}
          href="/app/opportunities"
          hrefLabel={tx("dashboard.exec.link.deals", "Deals")}
        >
          <div className="font-display text-2xl font-semibold tabular-nums">{inr(data.forecastTotal)}</div>
          <p className="text-[11px] text-muted-foreground">{tx("dashboard.exec.forecast.caption", "probability-weighted, open deals")}</p>
          <div className="mt-3 flex h-16 items-end gap-1">
            {data.forecastByMonth.map((m) => {
              const monthLabel = m.month === "No date" ? tx("dashboard.exec.forecast.noDate", "No date") : m.month;
              return (
                <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${monthLabel}: ${inr(m.weighted)} · ${formatNumber(m.deals)}`}>
                  <div
                    className={cn("w-full rounded-t", m.month === "No date" ? "bg-muted-foreground/30" : "bg-primary/70")}
                    style={{ height: `${Math.max(3, (m.weighted / maxForecast) * 100)}%` }}
                  />
                  <span className="truncate text-[8px] uppercase text-muted-foreground">{monthLabel}</span>
                </div>
              );
            })}
          </div>
        </Widget>

        {/* 3 · Resource utilization */}
        <Widget
          icon={Gauge}
          title={tx("dashboard.exec.utilization.title", "Resource Utilization")}
          href="/app/projects/workload"
          hrefLabel={tx("dashboard.exec.link.workload", "Workload")}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums">{pct(data.utilization.pct)}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatNumber(data.utilization.busy)}/{formatNumber(data.utilization.members)}{" "}
              {tx("dashboard.exec.utilization.membersOnTasks", "members on tasks this week")}
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary/70" style={{ width: `${data.utilization.pct}%` }} />
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>{tx("dashboard.exec.utilization.overloaded", "Overloaded members")}</span>
              <span className={cn("font-semibold tabular-nums", data.utilization.overloaded > 0 && "text-destructive")}>
                {formatNumber(data.utilization.overloaded)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tx("dashboard.exec.utilization.unassigned", "Unassigned tasks (this week)")}</span>
              <span className={cn("font-semibold tabular-nums", data.utilization.unassignedTasks > 0 && "text-amber-600 dark:text-amber-400")}>
                {formatNumber(data.utilization.unassignedTasks)}
              </span>
            </div>
          </div>
        </Widget>

        {/* 4 · Win probability */}
        <Widget
          icon={Percent}
          title={tx("dashboard.exec.winProbability.title", "Win Probability")}
          href="/app/opportunities"
          hrefLabel={tx("dashboard.exec.link.deals", "Deals")}
        >
          {data.winProbability.openDeals === 0 ? (
            <Empty>{tx("dashboard.exec.winProbability.empty", "No open deals to score.")}</Empty>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">{tx("dashboard.exec.winProbability.openPipeline", "Open pipeline (value-weighted)")}</span>
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {pct(data.winProbability.avgOpenProbability)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${data.winProbability.avgOpenProbability}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">{tx("dashboard.exec.winProbability.realized", "Realized win rate (closed deals)")}</span>
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {pct(data.winProbability.realizedWinRate)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${data.winProbability.realizedWinRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatNumber(data.winProbability.openDeals)}{" "}
                {tx("dashboard.exec.winProbability.footnote", "open deal — gap between the two = optimism in stage probabilities.")}
              </p>
            </div>
          )}
        </Widget>

        {/* 5 · Gross margin */}
        <Widget
          icon={Warehouse}
          title={tx("dashboard.exec.grossMargin.title", "Gross Margin")}
          href="/app/quotations"
          hrefLabel={tx("dashboard.exec.link.quotes", "Quotes")}
        >
          {data.grossMargin.quotes === 0 ? (
            <Empty>{tx("dashboard.exec.grossMargin.empty", "No active quotations (sent / approval / accepted).")}</Empty>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {pct(data.grossMargin.avgMarginPct)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {tx("dashboard.exec.grossMargin.avgAcross", "avg across {quotes} active quotes", { quotes: formatNumber(data.grossMargin.quotes) })}
                </span>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "rounded-full",
                    data.grossMargin.avgMarginPct >= 25 ? "bg-emerald-500/80" : data.grossMargin.avgMarginPct >= 15 ? "bg-amber-500/80" : "bg-destructive/80"
                  )}
                  style={{ width: `${Math.min(100, Math.max(2, data.grossMargin.avgMarginPct))}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {tx("dashboard.exec.grossMargin.projectedProfit", "Projected profit {amount} if all active quotes close.", { amount: inr(data.grossMargin.totalProfit) })}
              </p>
            </>
          )}
        </Widget>

        {/* 6 · Project health */}
        <Widget
          icon={HeartPulse}
          title={tx("dashboard.exec.projectHealth.title", "Project Health")}
          href="/app/projects"
          hrefLabel={tx("dashboard.exec.link.projects", "Projects")}
        >
          {healthTotal === 0 ? (
            <Empty>{tx("dashboard.exec.projectHealth.empty", "No projects yet — convert a won opportunity.")}</Empty>
          ) : (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {data.projectHealth.map((h) => (
                  <div
                    key={h.health}
                    className={HEALTH_COLOR[h.health]}
                    style={{ width: `${(h.count / healthTotal) * 100}%` }}
                    title={`${tx(HEALTH_KEY[h.health], HEALTH_META[h.health].label)}: ${formatNumber(h.count)}`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {data.projectHealth.map((h) => (
                  <li key={h.health} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-2 w-2 rounded-full", HEALTH_COLOR[h.health])} />
                    <span className="text-muted-foreground">{tx(HEALTH_KEY[h.health], HEALTH_META[h.health].label)}</span>
                    <span className="ms-auto font-semibold tabular-nums">{formatNumber(h.count)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Widget>

        {/* 7 · Duration benchmarks */}
        <Widget
          icon={Ruler}
          title={tx("dashboard.exec.durationBenchmarks.title", "Duration Benchmarks")}
          href="/app/admin"
          hrefLabel={tx("dashboard.exec.link.config", "Config")}
        >
          {data.durationBenchmarks.length === 0 ? (
            <Empty>{tx("dashboard.exec.durationBenchmarks.empty", "No methodologies configured.")}</Empty>
          ) : (
            <div className="space-y-3">
              {data.durationBenchmarks.map((b) => {
                const max = Math.max(b.baselineWeeks, b.avgActualWeeks, 1);
                return (
                  <div key={b.methodology}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="truncate">{b.methodology}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatNumber(b.projects)} {tx("dashboard.exec.durationBenchmarks.projectCount", "project")}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 rounded-full bg-muted-foreground/40" style={{ width: `${(b.baselineWeeks / max) * 100}%` }} />
                        <span className="text-[9px] tabular-nums text-muted-foreground">
                          {tx("dashboard.exec.durationBenchmarks.baseline", "baseline")}{" "}
                          {tx("common.weeksShort", "{weeks}wk", { weeks: formatNumber(b.baselineWeeks) })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn("h-1.5 rounded-full", b.avgActualWeeks > b.baselineWeeks ? "bg-amber-500/80" : "bg-primary/70")}
                          style={{ width: `${((b.avgActualWeeks || 0) / max) * 100}%` }}
                        />
                        <span className="text-[9px] tabular-nums text-muted-foreground">
                          {b.projects ? (
                            <>
                              {tx("dashboard.exec.durationBenchmarks.plannedAvg", "planned avg")}{" "}
                              {tx("common.weeksShort", "{weeks}wk", { weeks: formatNumber(b.avgActualWeeks) })}
                            </>
                          ) : (
                            tx("dashboard.exec.durationBenchmarks.noProjects", "no projects")
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Widget>

        {/* 8 · Delivery capacity */}
        <Widget
          icon={Users2}
          title={tx("dashboard.exec.capacity.title", "Delivery Capacity")}
          href="/app/projects/workload"
          hrefLabel={tx("dashboard.exec.link.workload", "Workload")}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums">{formatNumber(data.capacity.slotsFree)}</span>
            <span className="text-[11px] text-muted-foreground">
              {tx("dashboard.exec.capacity.freeSlots", "free task slots of {slotsTotal} ({members} members × 2 concurrent)", {
                slotsTotal: formatNumber(data.capacity.slotsTotal),
                members: formatNumber(data.capacity.members),
              })}
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("rounded-full", data.capacity.pct >= 90 ? "bg-destructive/80" : data.capacity.pct >= 70 ? "bg-amber-500/80" : "bg-emerald-500/80")}
              style={{ width: `${data.capacity.pct}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {formatNumber(data.capacity.slotsUsed)}{" "}
            {tx("dashboard.exec.capacity.slotsInUse", "slot in use this week ·")}{" "}
            {data.capacity.pct >= 90
              ? tx("dashboard.exec.capacity.statusFull", "at capacity — hire or reschedule before committing new work")
              : data.capacity.pct >= 70
                ? tx("dashboard.exec.capacity.statusTight", "tightening — sequence new starts carefully")
                : tx("dashboard.exec.capacity.statusOpen", "room to take on new delivery work")}
          </p>
        </Widget>
      </div>
    </section>
  );
}
