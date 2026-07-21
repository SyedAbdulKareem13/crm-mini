"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1)/.6)",
  "hsl(var(--chart-2)/.6)",
  "hsl(var(--chart-3)/.6)",
];

export function LeadSourcesChart({
  data,
}: {
  data: { source: string; count: number }[];
}) {
  const { tx, formatNumber } = useI18n();
  const total = data.reduce((a, b) => a + b.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("dashboard.leadSources.title", "Lead sources")}</CardTitle>
        <CardDescription>{tx("dashboard.leadSources.subtitle", "Where leads come from")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-72 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="source"
                innerRadius={64}
                outerRadius={96}
                paddingAngle={3}
                cornerRadius={6}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border bg-card/95 p-3 text-xs shadow-luxury backdrop-blur">
                      <div className="font-semibold capitalize">
                        {String(payload[0].payload.source).toLowerCase().replace("_", " ")}
                      </div>
                      <div className="text-muted-foreground">
                        {formatNumber(Number(payload[0].value))} {tx("dashboard.leadSources.leadsCount", "leads")}
                      </div>
                    </div>
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-2xl font-semibold">{formatNumber(total)}</div>
            <div className="text-xs text-muted-foreground">{tx("dashboard.leadSources.totalLeads", "Total leads")}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {data.map((d, i) => (
            <span key={d.source} className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="capitalize">{d.source.toLowerCase().replace("_", " ")}</span>
              <span className="text-muted-foreground">{formatNumber(d.count)}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
