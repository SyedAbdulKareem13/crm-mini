import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApprovalPanel } from "@/components/quotation/approval-panel";
import { RecordAuditTrail } from "@/components/audit/record-audit-trail";
import { LifecycleHeader } from "@/components/lifecycle/lifecycle-header";
import { ThreadTimeline, ThreadHistory } from "@/components/lifecycle/thread-insights";
import { getLifecycleThread } from "@/lib/lifecycle";
import { EditQuotationDialog } from "./edit-quotation-dialog";

const EDITABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL", "REJECTED"];

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      customer: true,
      rfq: true,
      opportunity: true,
      items: { orderBy: { position: "asc" } },
      positions: true,
      approvalRequest: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  });
  if (!q) notFound();

  const thread = await getLifecycleThread(session.user.organizationId, { type: "QUOTATION", id });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All quotations
        </Link>
        <div className="flex items-center gap-2">
          <EditQuotationDialog
            editable={EDITABLE_STATUSES.includes(q.status)}
            quotation={{
              id: q.id,
              quotationNumber: q.quotationNumber,
              notes: q.notes,
              termsAndConditions: q.termsAndConditions,
              validUntil: q.validUntil ? q.validUntil.toISOString() : null,
              items: q.items.map((it) => ({
                itemType: it.itemType as "MANPOWER" | "NON_MANPOWER" | "LICENSE",
                description: it.description,
                quantity: Number(it.quantity),
                uom: it.uom,
                unitCost: Number(it.unitCost),
                markupPct: Number(it.markupPct),
                discountPct: Number(it.discountPct),
                taxPct: Number(it.taxPct),
                manpowerGrade: it.manpowerGrade,
                manpowerExperience: it.manpowerExperience,
                licenseProduct: it.licenseProduct,
                licenseDuration: it.licenseDuration,
              })),
            }}
          />
          <Link href={`/app/quotations/${q.id}/print`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
          </Link>
        </div>
      </div>

      {thread && (
        <div className="mt-4">
          <LifecycleHeader
            thread={thread}
            entity={{ type: "QUOTATION", id: q.id, status: q.status }}
            viewerRole={session.user.role ?? ""}
            cancelInfo={
              q.cancelledAt
                ? {
                    at: q.cancelledAt.toISOString(),
                    by: q.cancelledByName,
                    reason: q.cancelReason,
                  }
                : null
            }
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{q.quotationNumber}</CardTitle>
              <Badge variant="soft">v{q.version}</Badge>
              <Badge variant="info">{q.status.toLowerCase().replace("_", " ")}</Badge>
            </div>
            <CardDescription>
              {q.customer.name}
              {q.rfq ? ` · linked to ${q.rfq.rfqNumber}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{it.itemType.toLowerCase().replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-right">{Number(it.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(it.unitCost))}</TableCell>
                    <TableCell className="text-right">{Number(it.markupPct)}%</TableCell>
                    <TableCell className="text-right">{Number(it.discountPct)}%</TableCell>
                    <TableCell className="text-right">{Number(it.taxPct)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(it.lineTotal))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-6" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Position determination</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {q.positions.length === 0 ? (
                    <div className="text-muted-foreground">No positions estimated.</div>
                  ) : (
                    q.positions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span>{p.headcount}× {p.designation} ({p.experience ?? "—"})</span>
                        <span className="text-muted-foreground">{formatCurrency(Number(p.revenue))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Totals</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <Row label="Base cost" value={formatCurrency(Number(q.baseCost))} />
                  <Row label="Markup" value={formatCurrency(Number(q.markupAmount))} />
                  <Row label="Discount" value={`-${formatCurrency(Number(q.discountAmount))}`} />
                  <Row label="Tax" value={formatCurrency(Number(q.taxAmount))} />
                  <Separator className="my-2" />
                  <Row label="Grand total" value={formatCurrency(Number(q.grandTotal))} bold />
                  <Row label="Profit" value={`${formatCurrency(Number(q.profitAmount))} (${Number(q.marginPct).toFixed(1)}%)`} />
                </div>
              </div>
            </div>

            {q.termsAndConditions ? (
              <div className="mt-4 rounded-xl border p-4 text-sm">
                <h3 className="font-semibold">Terms & Conditions</h3>
                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{q.termsAndConditions}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ApprovalPanel
            quotationId={q.id}
            status={q.status}
            request={
              q.approvalRequest
                ? JSON.parse(JSON.stringify(q.approvalRequest))
                : null
            }
          />
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="font-medium">{q.customer.name}</div>
              <div className="text-muted-foreground">{q.customer.industry ?? "—"}</div>
              <div className="mt-2 text-muted-foreground">{q.customer.billingAddress ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Meta</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Currency" value={q.currency} />
              <Row label="Created" value={formatDate(q.createdAt)} />
              <Row label="Valid until" value={formatDate(q.validUntil)} />
            </CardContent>
          </Card>
          <ThreadTimeline entityType="QUOTATION" entityId={q.id} />
          <ThreadHistory entityType="QUOTATION" entityId={q.id} />
          <RecordAuditTrail organizationId={session.user.organizationId} entityType="QUOTATION" entityId={q.id} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
