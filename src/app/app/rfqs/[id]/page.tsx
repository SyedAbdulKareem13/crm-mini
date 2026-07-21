import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileDown, FileText, Receipt } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LifecycleHeader } from "@/components/lifecycle/lifecycle-header";
import { ThreadTimeline } from "@/components/lifecycle/thread-insights";
import { getLifecycleThread } from "@/lib/lifecycle";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RFQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const orgId = session.user.organizationId;
  const role = session.user.role;
  if (!(await can(orgId, role, "RFQS", "read"))) redirect("/app");
  const canCancel = await can(orgId, role, "RFQS", "cancel");
  const canReopen = await can(orgId, role, "RFQS", "reopen");
  const rfq = await prisma.rFQ.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      customer: true,
      opportunity: true,
      lineItems: { orderBy: { position: "asc" } },
      quotations: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!rfq) notFound();

  const thread = await getLifecycleThread(session.user.organizationId, { type: "RFQ", id });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/rfqs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All RFQs
        </Link>
        <Link href={`/app/rfqs/${rfq.id}/print`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
        </Link>
      </div>

      {thread && (
        <div className="mt-4">
          <LifecycleHeader
            thread={thread}
            entity={{ type: "RFQ", id: rfq.id, status: rfq.status }}
            viewerRole={session.user.role ?? ""}
            canCancel={canCancel}
            canReopen={canReopen}
            cancelInfo={
              rfq.cancelledAt
                ? {
                    at: rfq.cancelledAt.toISOString(),
                    by: rfq.cancelledByName,
                    reason: rfq.cancelReason,
                  }
                : null
            }
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>RFQ {rfq.rfqNumber}</CardTitle>
              <Badge variant="soft">{rfq.status.toLowerCase().replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {rfq.customer.name}
              {rfq.opportunity ? ` · ${rfq.opportunity.oppNumber}` : ""}
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <Info label="Currency" value={rfq.currency} />
            <Info label="Due" value={formatDate(rfq.dueDate)} />
            <Info label="Created" value={formatDate(rfq.createdAt)} />
            <Info label="Lines" value={String(rfq.lineItems.length)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/app/quotations/new?rfqId=${rfq.id}`}>
              <Button variant="gradient" className="w-full">
                <Receipt className="h-4 w-4" /> Generate quotation
              </Button>
            </Link>
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4" /> Upload document
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Grade / Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UoM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.lineItems.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell><Badge variant="outline">{l.lineType.toLowerCase().replace("_", " ")}</Badge></TableCell>
                    <TableCell>{l.description}</TableCell>
                    <TableCell>{l.manpowerGrade ?? l.licenseProduct ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(l.quantity)}</TableCell>
                    <TableCell>{l.uom ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <ThreadTimeline entityType="RFQ" entityId={rfq.id} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
