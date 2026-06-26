import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency, formatDate } from "@/lib/utils";
import { DraftWithAiButton } from "./draft-with-ai-button";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, any> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "destructive",
  EXPIRED: "outline",
};

export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const quotations = await prisma.quotation.findMany({
    where: { organizationId: session.user.organizationId },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title="Quotations"
        description="Generate quotations from RFQs — with markup, discount, tax, and full approval flow."
        actions={
          <>
            <DraftWithAiButton />
            <Link href="/app/quotations/new">
              <Button variant="gradient"><Plus className="h-4 w-4" /> New quotation</Button>
            </Link>
          </>
        }
      />
      {quotations.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Generate one from an RFQ in the RFQ module."
          action={
            <Link href="/app/quotations/new">
              <Button variant="gradient">Create quotation</Button>
            </Link>
          }
        />
      ) : (
        <div className="luxury-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Grand total</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Valid until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Link href={`/app/quotations/${q.id}`} className="font-medium hover:underline">
                      {q.quotationNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{q.customer.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[q.status] ?? "soft"}>
                      {q.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>v{q.version}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCompactCurrency(Number(q.grandTotal), q.currency)}
                  </TableCell>
                  <TableCell className="text-right">{Number(q.marginPct).toFixed(1)}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(q.validUntil)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
