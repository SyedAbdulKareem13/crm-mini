"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

export function MonthlyRevenueChart({
  data,
  className,
}: {
  data: { month: string; revenue: number; deals: number }[];
  className?: string;
}) {
  const { tx, formatNumber } = useI18n();
  const inr = (n: number) =>
    formatNumber(n, { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>{tx("dashboard.monthlyRevenue.title", "Monthly revenue")}</CardTitle>
        <CardDescription>{tx("dashboard.monthlyRevenue.subtitle", "Closed-won revenue over the last 6 months")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => inr(Number(v))}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border bg-card/95 p-3 text-xs shadow-luxury backdrop-blur">
                      <div className="font-semibold">{label}</div>
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                        {tx("dashboard.monthlyRevenue.revenueLabel", "Revenue:")}{" "}
                        <span className="font-semibold text-foreground">
                          {inr(payload[0].value as number)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {tx("dashboard.monthlyRevenue.dealsLabel", "Deals:")} {formatNumber(payload[0].payload.deals as number)}
                      </div>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                fill="url(#grad-revenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
