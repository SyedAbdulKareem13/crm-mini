"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OPP_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n/provider";
import { stageKey } from "@/lib/i18n/labels";

export function FunnelChart({
  data,
  className,
}: {
  data: { stage: string; count: number; value: number }[];
  className?: string;
}) {
  const { tx, formatNumber } = useI18n();
  const inr = (n: number) =>
    formatNumber(n, { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
  const byStage = new Map(data.map((d) => [d.stage, d]));
  const ordered = OPP_STAGES.filter((s) => s.value !== "LOST");
  const max = Math.max(1, ...ordered.map((s) => byStage.get(s.value)?.count ?? 0));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>{tx("dashboard.funnel.title", "Sales funnel")}</CardTitle>
        <CardDescription>{tx("dashboard.funnel.subtitle", "Opportunities by stage")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ordered.map((s, i) => {
            const row = byStage.get(s.value);
            const count = row?.count ?? 0;
            const value = row?.value ?? 0;
            const pct = (count / max) * 100;
            return (
              <motion.div
                key={s.value}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3"
              >
                <div className="w-44 shrink-0 text-sm text-muted-foreground">{tx(stageKey(s.value), s.label)}</div>
                <div className="relative h-9 flex-1 overflow-hidden rounded-xl bg-muted/40">
                  <motion.div
                    className={cn("h-full rounded-xl bg-gradient-to-r", s.tone)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, 6)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                    <span className="font-medium">{formatNumber(count)}</span>
                    <span className="text-muted-foreground">{inr(value)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
