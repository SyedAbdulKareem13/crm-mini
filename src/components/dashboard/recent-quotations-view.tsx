"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

const statusToVariant: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "soft" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "destructive",
  EXPIRED: "outline",
};

/** Client view for the "Recent quotations" widget. Receives a plain,
 *  already-serialized shape from the Server wrapper (recent-quotations.tsx),
 *  so it can localize copy + format currency via the active locale. */
export function RecentQuotationsView({
  items,
}: {
  items: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    grandTotal: number;
    createdAt: Date | string;
    customerName: string;
  }>;
}) {
  const { tx, formatNumber } = useI18n();
  const inr = (n: number) =>
    formatNumber(n, { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("dashboard.recentQuotations.title", "Recent quotations")}</CardTitle>
        <CardDescription>{tx("dashboard.recentQuotations.subtitle", "Latest pricing sent to customers")}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title={tx("dashboard.recentQuotations.emptyTitle", "No quotations yet")}
            description={tx("dashboard.recentQuotations.emptyDesc", "Generate one from an RFQ.")}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/app/quotations/${q.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--chart-2))/.2] to-[hsl(var(--chart-1))/.2] text-primary font-semibold text-xs">
                    {q.quotationNumber.split("-").pop()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {q.quotationNumber} · {formatRelativeTime(q.createdAt)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-semibold text-sm">{inr(q.grandTotal)}</div>
                    <Badge variant={statusToVariant[q.status] ?? "soft"} className="mt-0.5">
                      {q.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
