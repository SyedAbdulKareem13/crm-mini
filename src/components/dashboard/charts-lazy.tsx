"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const chartFallback = () => <Skeleton className="h-[360px] w-full rounded-2xl" />;

/**
 * Recharts is the heaviest client dependency. These charts sit below the KPI
 * fold and have no SEO value, so we load them in a separate async chunk after
 * first paint (ssr:false) with a fixed-height skeleton to avoid layout shift.
 */
export const MonthlyRevenueChart = dynamic(
  () => import("./monthly-revenue-chart").then((m) => m.MonthlyRevenueChart),
  { ssr: false, loading: chartFallback }
);

export const LeadSourcesChart = dynamic(
  () => import("./lead-sources-chart").then((m) => m.LeadSourcesChart),
  { ssr: false, loading: chartFallback }
);
