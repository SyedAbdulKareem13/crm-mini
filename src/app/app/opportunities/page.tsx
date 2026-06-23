import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Kanban as KanbanIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { OpportunityCreate } from "@/components/opportunities/opportunity-create";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency, formatDate } from "@/lib/utils";
import { OPP_STAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const opps = await prisma.opportunity.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true } },
      owner: { select: { name: true } },
    },
    take: 200,
  });
  const customers = await prisma.customer.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const stageMap = new Map(OPP_STAGES.map((s) => [s.value, s.label]));

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Every active and historical deal across the business."
        actions={
          <div className="flex gap-2">
            <Link href="/app/pipeline">
              <Button variant="outline">
                <KanbanIcon className="h-4 w-4" /> Pipeline view
              </Button>
            </Link>
            <Suspense fallback={null}>
              <OpportunityCreate customers={customers} />
            </Suspense>
          </div>
        }
      />

      {opps.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Create your first deal — or convert a qualified lead."
          action={
            <Link href="/app/leads">
              <Button variant="gradient">Convert a lead</Button>
            </Link>
          }
        />
      ) : (
        <div className="luxury-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead>Close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opps.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/app/opportunities/${o.id}`} className="font-medium hover:underline">
                      {o.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{o.oppNumber}</div>
                  </TableCell>
                  <TableCell>{o.customer.name}</TableCell>
                  <TableCell>
                    <Badge variant="soft">{stageMap.get(o.stage) ?? o.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{o.owner?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCompactCurrency(Number(o.expectedRevenue))}
                  </TableCell>
                  <TableCell className="text-right">{o.probability}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(o.expectedCloseDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
