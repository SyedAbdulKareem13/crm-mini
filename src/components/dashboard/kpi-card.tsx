"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Icon } from "@/components/app/icon";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

export function KpiCard({
  label,
  labelKey,
  value,
  icon,
  money,
  trend,
  tone,
}: {
  label: string;
  /** Optional i18n key for the label; resolves via tx() with `label` as the
   *  English fallback so the English UI stays intact before rows are seeded. */
  labelKey?: string;
  value: number;
  icon: string;
  money?: boolean;
  trend?: number;
  tone?: "default" | "success" | "danger" | "info";
}) {
  const { tx, formatNumber } = useI18n();
  const displayLabel = labelKey ? tx(labelKey, label) : label;
  const toneClasses =
    tone === "success"
      ? "from-success/15 to-success/0 text-success ring-success/20"
      : tone === "danger"
      ? "from-destructive/15 to-destructive/0 text-destructive ring-destructive/20"
      : tone === "info"
      ? "from-info/15 to-info/0 text-info ring-info/20"
      : "from-primary/15 to-primary/0 text-primary ring-primary/20";

  return (
    <div className="luxury-card hover-lift relative overflow-hidden p-5">
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-60",
          toneClasses.split(" ").slice(0, 2).join(" ")
        )}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {displayLabel}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
            toneClasses
          )}
        >
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {money
          ? formatNumber(value, {
              style: "currency",
              currency: "INR",
              notation: "compact",
              maximumFractionDigits: 1,
            })
          : formatNumber(value)}
      </div>
      {trend !== undefined ? (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend >= 0 ? (
            <ArrowUp className="h-3 w-3 text-success" />
          ) : (
            <ArrowDown className="h-3 w-3 text-destructive" />
          )}
          <span className={trend >= 0 ? "text-success" : "text-destructive"}>
            {formatNumber(Math.abs(trend) / 100, { style: "percent", maximumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground">{tx("dashboard.kpi.vsLastMonth", "vs last month")}</span>
        </div>
      ) : null}
    </div>
  );
}
