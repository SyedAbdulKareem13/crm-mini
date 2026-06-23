import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatDate } from "@/lib/utils";
import { OPP_STAGES } from "@/lib/constants";
import { OpportunityStage } from "@/components/opportunities/opportunity-stage";
import { OpportunityEditButton } from "@/components/opportunities/opportunity-edit-button";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const opp = await prisma.opportunity.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      customer: { include: { contacts: true } },
      owner: { select: { name: true } },
      revenueOwner: { select: { name: true } },
      rfqs: { orderBy: { createdAt: "desc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!opp) notFound();
  const stageLabel = OPP_STAGES.find((s) => s.value === opp.stage)?.label ?? opp.stage;

  const customers = await prisma.customer.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const oppForEdit = {
    id: opp.id,
    name: opp.name,
    customerId: opp.customerId,
    expectedRevenue: Number(opp.expectedRevenue),
    probability: opp.probability,
    expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.toISOString() : null,
    stage: opp.stage,
    notes: opp.notes,
  };

  return (
    <div>
      <Link href="/app/opportunities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All opportunities
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>{opp.name}</CardTitle>
                  <Badge variant="soft">{opp.oppNumber}</Badge>
                  <Badge variant="info">{stageLabel}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{opp.customer.name}</div>
              </div>
              <OpportunityEditButton opportunity={oppForEdit} customers={customers} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <Info label="Expected revenue" value={formatCompactCurrency(Number(opp.expectedRevenue))} />
              <Info label="Probability" value={`${opp.probability}%`} />
              <Info label="Close date" value={formatDate(opp.expectedCloseDate)} />
              <Info label="Stage age" value={`${Math.max(0, Math.floor((Date.now() - opp.stageEnteredAt.getTime()) / 86400000))}d`} />
              <Info label="Owner" value={opp.owner?.name ?? "Unassigned"} />
              <Info label="Revenue owner" value={opp.revenueOwner?.name ?? "Unassigned"} />
              <Info label="Created" value={formatDate(opp.createdAt)} />
              <Info label="Updated" value={formatDate(opp.updatedAt)} />
            </CardContent>
          </Card>

          <OpportunityStage opportunityId={opp.id} stage={opp.stage} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>RFQs</CardTitle>
              <Link href={`/app/rfqs/new?opportunityId=${opp.id}`}>
                <Button size="sm" variant="outline">New RFQ</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {opp.rfqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No RFQs yet for this opportunity.</p>
              ) : (
                <ul className="space-y-2">
                  {opp.rfqs.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/app/rfqs/${r.id}`}
                        className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent/40"
                      >
                        <div>
                          <div className="font-medium">{r.rfqNumber}</div>
                          <div className="text-xs text-muted-foreground">Due {formatDate(r.dueDate)}</div>
                        </div>
                        <Badge variant="soft">{r.status.toLowerCase().replace("_", " ")}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              {opp.quotations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quotations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {opp.quotations.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/app/quotations/${q.id}`}
                        className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent/40"
                      >
                        <div>
                          <div className="font-medium">{q.quotationNumber}</div>
                          <div className="text-xs text-muted-foreground">v{q.version}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCompactCurrency(Number(q.grandTotal))}</div>
                          <Badge variant="soft">{q.status.toLowerCase().replace("_", " ")}</Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium">{opp.customer.name}</div>
              <div className="text-sm text-muted-foreground">{opp.customer.industry ?? "—"}</div>
              {opp.customer.contacts[0] ? (
                <div className="mt-3 text-sm">
                  <div>{opp.customer.contacts[0].name}</div>
                  <div className="text-muted-foreground">{opp.customer.contacts[0].email}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {opp.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet.</p>
              ) : (
                <ol className="relative space-y-3 border-l pl-4">
                  {opp.activities.slice(0, 12).map((a) => (
                    <li key={a.id}>
                      <span className="absolute -left-[7px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="text-sm font-medium">{a.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.type.toLowerCase()} · {formatDate(a.createdAt)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
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
