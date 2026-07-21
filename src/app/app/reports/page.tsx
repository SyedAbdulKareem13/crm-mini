import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "REPORTS", "read"));
  if (denied) redirect("/app");
  const orgId = session.user.organizationId;

  const [
    leadConversion,
    funnel,
    rfqStatus,
    quotationReport,
    winLoss,
    salesPerf,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: { organizationId: orgId },
      _count: { _all: true },
      _sum: { expectedRevenue: true },
    }),
    prisma.rFQ.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.quotation.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    prisma.opportunity.groupBy({
      by: ["stage"],
      where: { organizationId: orgId, stage: { in: ["WON", "LOST"] } },
      _count: { _all: true },
      _sum: { expectedRevenue: true },
    }),
    prisma.opportunity.groupBy({
      by: ["ownerId"],
      where: { organizationId: orgId },
      _count: { _all: true },
      _sum: { expectedRevenue: true },
    }),
  ]);

  const owners = await prisma.user.findMany({
    where: { id: { in: salesPerf.map((s) => s.ownerId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });
  const ownerMap = new Map(owners.map((o) => [o.id, o.name ?? "—"]));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales performance, conversion, RFQ health, quotation status, win/loss & revenue forecast."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard title="Lead conversion" description="Leads by status">
          <Table>
            <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
            <TableBody>
              {leadConversion.map((r) => (
                <TableRow key={r.status}>
                  <TableCell><Badge variant="soft">{r.status.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Opportunity funnel" description="Stage-wise count & value">
          <Table>
            <TableHeader><TableRow><TableHead>Stage</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {funnel.map((r) => (
                <TableRow key={r.stage}>
                  <TableCell><Badge variant="soft">{r.stage.toLowerCase().replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(Number(r._sum.expectedRevenue ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="RFQ status" description="Open work in RFQs">
          <Table>
            <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
            <TableBody>
              {rfqStatus.map((r) => (
                <TableRow key={r.status}>
                  <TableCell><Badge variant="soft">{r.status.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Quotation report" description="Status & total value">
          <Table>
            <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {quotationReport.map((r) => (
                <TableRow key={r.status}>
                  <TableCell><Badge variant="soft">{r.status.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(Number(r._sum.grandTotal ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Win / loss analysis" description="Closed deals">
          <Table>
            <TableHeader><TableRow><TableHead>Outcome</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {winLoss.map((r) => (
                <TableRow key={r.stage}>
                  <TableCell>
                    <Badge variant={r.stage === "WON" ? "success" : "destructive"}>{r.stage.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(Number(r._sum.expectedRevenue ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Sales performance" description="By owner">
          <Table>
            <TableHeader><TableRow><TableHead>Owner</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Pipeline</TableHead></TableRow></TableHeader>
            <TableBody>
              {salesPerf.map((r) => (
                <TableRow key={r.ownerId ?? "unassigned"}>
                  <TableCell>{r.ownerId ? ownerMap.get(r.ownerId) ?? "—" : "Unassigned"}</TableCell>
                  <TableCell className="text-right">{r._count._all}</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(Number(r._sum.expectedRevenue ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>
      </div>
    </>
  );
}

function ReportCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
