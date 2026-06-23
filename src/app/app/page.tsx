import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthlyRevenueChart, LeadSourcesChart } from "@/components/dashboard/charts-lazy";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks";
import { RecentQuotations } from "@/components/dashboard/recent-quotations";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const data = await getDashboardData(session.user.organizationId);

  return (
    <>
      <PageHeader
        title={`Welcome back${session.user.name ? ", " + session.user.name.split(" ")[0] : ""}`}
        description="Here's how your revenue motion is performing today."
        actions={
          <div className="flex gap-2">
            <Link href="/app/leads?new=1">
              <Button variant="outline">
                <Plus className="h-4 w-4" /> Lead
              </Button>
            </Link>
            <Link href="/app/opportunities?new=1">
              <Button variant="gradient">
                <Plus className="h-4 w-4" /> Opportunity
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Leads" value={data.kpi.totalLeads} icon="Sparkles" trend={+12} />
        <KpiCard label="Open Opportunities" value={data.kpi.openOpps} icon="Target" trend={+8} />
        <KpiCard label="Won Deals" value={data.kpi.wonOpps} icon="Trophy" trend={+22} tone="success" />
        <KpiCard label="Lost Deals" value={data.kpi.lostOpps} icon="X" trend={-4} tone="danger" />
        <KpiCard label="RFQs Pending" value={data.kpi.rfqsPending} icon="FileText" />
        <KpiCard label="Quotations Submitted" value={data.kpi.quotationsSubmitted} icon="Receipt" />
        <KpiCard label="Pipeline Value" value={data.kpi.pipelineValue} icon="Coins" money tone="info" />
        <KpiCard label="Revenue Forecast" value={data.kpi.revenueForecast} icon="TrendingUp" money tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MonthlyRevenueChart data={data.monthlyRevenue} className="lg:col-span-2" />
        <LeadSourcesChart data={data.leadSources} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <FunnelChart data={data.funnel} className="lg:col-span-2" />
        <UpcomingTasks tasks={data.upcomingTasks} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentActivities activities={data.recentActivities} />
        <RecentQuotations quotations={data.recentQuotations} />
      </div>
    </>
  );
}
