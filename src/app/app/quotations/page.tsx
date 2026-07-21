import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompactCurrency, formatDate } from "@/lib/utils";
import { DraftWithAiButton } from "./draft-with-ai-button";

export const dynamic = "force-dynamic";

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
                    <div className="flex items-center gap-2">
                      <Link href={`/app/quotations/${q.id}`} className="font-medium hover:underline">
                        {q.quotationNumber}
                      </Link>
                      {q.draftedByAi ? (
                        <span
                          title="Drafted with Manz AI"
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                        >
                          <Sparkles className="h-3 w-3" /> AI
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{q.customer.name}</TableCell>
                  <TableCell>
                    <StatusBadge entity="QUOTATION" status={q.status} />
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
