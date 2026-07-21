import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RFQsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const rfqs = await prisma.rFQ.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      customer: { select: { name: true } },
      opportunity: { select: { name: true, oppNumber: true } },
      _count: { select: { lineItems: true, quotations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title="RFQs"
        description="Requests for Quotation from customers — wire each to manpower, license & non-manpower."
        actions={
          <Link href="/app/rfqs/new">
            <Button variant="gradient"><Plus className="h-4 w-4" /> New RFQ</Button>
          </Link>
        }
      />
      {rfqs.length === 0 ? (
        <EmptyState
          title="No RFQs yet"
          description="Receive an RFQ or create one against an opportunity."
          action={
            <Link href="/app/rfqs/new">
              <Button variant="gradient">Create RFQ</Button>
            </Link>
          }
        />
      ) : (
        <div className="luxury-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Quotes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/app/rfqs/${r.id}`} className="font-medium hover:underline">
                      {r.rfqNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.opportunity ? `${r.opportunity.oppNumber} · ${r.opportunity.name}` : "—"}
                  </TableCell>
                  <TableCell>{r._count.lineItems}</TableCell>
                  <TableCell>{r._count.quotations}</TableCell>
                  <TableCell><StatusBadge entity="RFQ" status={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
