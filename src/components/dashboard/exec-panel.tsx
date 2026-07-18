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

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const HEALTH_COLOR: Record<ProjectHealth, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  DELAYED: "bg-destructive",
  ON_HOLD: "bg-slate-400",
  COMPLETED: "bg-primary/60",
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
          {hrefLabel} <ArrowUpRight className="h-3 w-3" />
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
  const maxPipeline = Math.max(...data.pipelineByProduct.map((p) => p.value), 1);
  const maxForecast = Math.max(...data.forecastByMonth.map((m) => m.weighted), 1);
  const healthTotal = data.projectHealth.reduce((n, h) => n + h.count, 0);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
            Executive Dashboard
            <span dir="rtl" className="font-urdu text-sm text-muted-foreground">ایگزیکٹو ڈیش بورڈ</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Presales &amp; delivery leadership — live from pipeline, quotations and project data.
          </p>
        </div>
      </div>

      <div className="mz-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1 · Pipeline by SAP product */}
        <Widget icon={Boxes} title="Pipeline by SAP Product" href="/app/pipeline" hrefLabel="Pipeline">
          {data.pipelineByProduct.length === 0 ? (
            <Empty>No open opportunities yet.</Empty>
          ) : (
            <div className="space-y-2">
              {data.pipelineByProduct.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {p.count} · {inr.format(p.value)}
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
                Product = the transformation type of the opportunity's project; convert opportunities to classify them.
              </p>
            </div>
          )}
        </Widget>

        {/* 2 · Revenue forecast */}
        <Widget icon={TrendingUp} title="Revenue Forecast" href="/app/opportunities" hrefLabel="Deals">
          <div className="font-display text-2xl font-semibold tabular-nums">{inr.format(data.forecastTotal)}</div>
          <p className="text-[11px] text-muted-foreground">probability-weighted, open deals</p>
          <div className="mt-3 flex h-16 items-end gap-1">
            {data.forecastByMonth.map((m) => (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.month}: ${inr.format(m.weighted)} · ${m.deals} deal${m.deals === 1 ? "" : "s"}`}>
                <div
                  className={cn("w-full rounded-t", m.month === "No date" ? "bg-muted-foreground/30" : "bg-primary/70")}
                  style={{ height: `${Math.max(3, (m.weighted / maxForecast) * 100)}%` }}
                />
                <span className="truncate text-[8px] uppercase text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </Widget>

        {/* 3 · Resource utilization */}
        <Widget icon={Gauge} title="Resource Utilization" href="/app/projects/workload" hrefLabel="Workload">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums">{data.utilization.pct}%</span>
            <span className="text-[11px] text-muted-foreground">
              {data.utilization.busy}/{data.utilization.members} members on tasks this week
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary/70" style={{ width: `${data.utilization.pct}%` }} />
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Overloaded members</span>
              <span className={cn("font-semibold tabular-nums", data.utilization.overloaded > 0 && "text-destructive")}>
                {data.utilization.overloaded}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Unassigned tasks (this week)</span>
              <span className={cn("font-semibold tabular-nums", data.utilization.unassignedTasks > 0 && "text-amber-600 dark:text-amber-400")}>
                {data.utilization.unassignedTasks}
              </span>
            </div>
          </div>
        </Widget>

        {/* 4 · Win probability */}
        <Widget icon={Percent} title="Win Probability" href="/app/opportunities" hrefLabel="Deals">
          {data.winProbability.openDeals === 0 ? (
            <Empty>No open deals to score.</Empty>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Open pipeline (value-weighted)</span>
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {data.winProbability.avgOpenProbability}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${data.winProbability.avgOpenProbability}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Realized win rate (closed deals)</span>
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {data.winProbability.realizedWinRate}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${data.winProbability.realizedWinRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {data.winProbability.openDeals} open deal{data.winProbability.openDeals === 1 ? "" : "s"} — gap between the two = optimism in stage probabilities.
              </p>
            </div>
          )}
        </Widget>

        {/* 5 · Gross margin */}
        <Widget icon={Warehouse} title="Gross Margin" href="/app/quotations" hrefLabel="Quotes">
          {data.grossMargin.quotes === 0 ? (
            <Empty>No active quotations (sent / approval / accepted).</Empty>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {data.grossMargin.avgMarginPct}%
                </span>
                <span className="text-[11px] text-muted-foreground">avg across {data.grossMargin.quotes} active quotes</span>
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
                Projected profit <span className="font-semibold text-foreground">{inr.format(data.grossMargin.totalProfit)}</span> if all active quotes close.
              </p>
            </>
          )}
        </Widget>

        {/* 6 · Project health */}
        <Widget icon={HeartPulse} title="Project Health" href="/app/projects" hrefLabel="Projects">
          {healthTotal === 0 ? (
            <Empty>No projects yet — convert a won opportunity.</Empty>
          ) : (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {data.projectHealth.map((h) => (
                  <div
                    key={h.health}
                    className={HEALTH_COLOR[h.health]}
                    style={{ width: `${(h.count / healthTotal) * 100}%` }}
                    title={`${HEALTH_META[h.health].label}: ${h.count}`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {data.projectHealth.map((h) => (
                  <li key={h.health} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-2 w-2 rounded-full", HEALTH_COLOR[h.health])} />
                    <span className="text-muted-foreground">{HEALTH_META[h.health].label}</span>
                    <span className="ml-auto font-semibold tabular-nums">{h.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Widget>

        {/* 7 · Duration benchmarks */}
        <Widget icon={Ruler} title="Duration Benchmarks" href="/app/admin" hrefLabel="Config">
          {data.durationBenchmarks.length === 0 ? (
            <Empty>No methodologies configured.</Empty>
          ) : (
            <div className="space-y-3">
              {data.durationBenchmarks.map((b) => {
                const max = Math.max(b.baselineWeeks, b.avgActualWeeks, 1);
                return (
                  <div key={b.methodology}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="truncate">{b.methodology}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {b.projects} project{b.projects === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 rounded-full bg-muted-foreground/40" style={{ width: `${(b.baselineWeeks / max) * 100}%` }} />
                        <span className="text-[9px] tabular-nums text-muted-foreground">baseline {b.baselineWeeks}wk</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn("h-1.5 rounded-full", b.avgActualWeeks > b.baselineWeeks ? "bg-amber-500/80" : "bg-primary/70")}
                          style={{ width: `${((b.avgActualWeeks || 0) / max) * 100}%` }}
                        />
                        <span className="text-[9px] tabular-nums text-muted-foreground">
                          {b.projects ? `planned avg ${b.avgActualWeeks}wk` : "no projects"}
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
        <Widget icon={Users2} title="Delivery Capacity" href="/app/projects/workload" hrefLabel="Workload">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums">{data.capacity.slotsFree}</span>
            <span className="text-[11px] text-muted-foreground">
              free task slots of {data.capacity.slotsTotal} ({data.capacity.members} members × 2 concurrent)
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("rounded-full", data.capacity.pct >= 90 ? "bg-destructive/80" : data.capacity.pct >= 70 ? "bg-amber-500/80" : "bg-emerald-500/80")}
              style={{ width: `${data.capacity.pct}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {data.capacity.slotsUsed} slot{data.capacity.slotsUsed === 1 ? "" : "s"} in use this week ·{" "}
            {data.capacity.pct >= 90
              ? "at capacity — hire or reschedule before committing new work"
              : data.capacity.pct >= 70
                ? "tightening — sequence new starts carefully"
                : "room to take on new delivery work"}
          </p>
        </Widget>
      </div>
    </section>
  );
}
