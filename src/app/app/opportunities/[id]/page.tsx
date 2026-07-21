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
import { RecordAuditTrail } from "@/components/audit/record-audit-trail";
import { ActivityPanel } from "@/components/activity/activity-panel";
import { CreateProjectButton } from "@/components/projects/create-project-button";
import { LifecycleHeader } from "@/components/lifecycle/lifecycle-header";
import { ThreadTimeline, ThreadHistory } from "@/components/lifecycle/thread-insights";
import { getLifecycleThread } from "@/lib/lifecycle";
import { getModuleConfig } from "@/lib/field-config";
import { can } from "@/lib/permissions";
import { getServerT } from "@/lib/i18n/server";
import { stageKey } from "@/lib/i18n/labels";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t: st } = await getServerT();
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const orgId = session.user.organizationId;
  const role = session.user.role;
  if (!(await can(orgId, role, "OPPORTUNITIES", "read"))) redirect("/app");
  const canCancel = await can(orgId, role, "OPPORTUNITIES", "cancel");
  const canReopen = await can(orgId, role, "OPPORTUNITIES", "reopen");

  const opp = await prisma.opportunity.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      customer: { include: { contacts: true } },
      owner: { select: { name: true } },
      revenueOwner: { select: { name: true } },
      rfqs: { orderBy: { createdAt: "desc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      project: { select: { id: true, projectNumber: true } },
    },
  });
  if (!opp) notFound();
  const stageLabel = OPP_STAGES.find((s) => s.value === opp.stage)?.label ?? opp.stage;

  const thread = await getLifecycleThread(session.user.organizationId, {
    type: "OPPORTUNITY",
    id,
  });

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
    data: (opp.data as Record<string, unknown> | null) ?? null,
  };

  // Admin-defined custom field values, labelled from the OPPORTUNITY field config.
  const oppConfig = await getModuleConfig(session.user.organizationId, "OPPORTUNITY");
  const customEntries = Object.entries(oppForEdit.data ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ({
      label: oppConfig.find((f) => f.fieldKey === k)?.label ?? k.replace(/^custom_/, "").replace(/_/g, " "),
      value: String(v),
    }));

  return (
    <div>
      <Link href="/app/opportunities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {st("opportunities.backToList", "All opportunities")}
      </Link>

      {thread && (
        <div className="mt-4">
          <LifecycleHeader
            thread={thread}
            entity={{ type: "OPPORTUNITY", id: opp.id, status: opp.stage }}
            viewerRole={session.user.role ?? ""}
            canCancel={canCancel}
            canReopen={canReopen}
            cancelInfo={
              opp.cancelledAt
                ? {
                    at: opp.cancelledAt.toISOString(),
                    by: opp.cancelledByName,
                    reason: opp.cancelReason,
                  }
                : null
            }
          />
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>{opp.name}</CardTitle>
                  <Badge variant="soft">{opp.oppNumber}</Badge>
                  <Badge variant="info">{st(stageKey(opp.stage), stageLabel)}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{opp.customer.name}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CreateProjectButton
                  opportunityId={opp.id}
                  opportunityName={opp.name}
                  project={opp.project}
                />
                <OpportunityEditButton opportunity={oppForEdit} customers={customers} />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <Info label={st("opportunities.metricExpectedRevenue", "Expected revenue")} value={formatCompactCurrency(Number(opp.expectedRevenue))} />
              <Info label={st("opportunities.metricProbability", "Probability")} value={`${opp.probability}%`} />
              <Info label={st("opportunities.metricCloseDate", "Close date")} value={formatDate(opp.expectedCloseDate)} />
              <Info label={st("opportunities.metricStageAge", "Stage age")} value={`${Math.max(0, Math.floor((Date.now() - opp.stageEnteredAt.getTime()) / 86400000))}d`} />
              <Info label={st("opportunities.metricOwner", "Owner")} value={opp.owner?.name ?? st("common.unassigned", "Unassigned")} />
              <Info label={st("opportunities.metricRevenueOwner", "Revenue owner")} value={opp.revenueOwner?.name ?? st("common.unassigned", "Unassigned")} />
              <Info label={st("opportunities.metricCreated", "Created")} value={formatDate(opp.createdAt)} />
              <Info label={st("opportunities.metricUpdated", "Updated")} value={formatDate(opp.updatedAt)} />
              {customEntries.map((e) => (
                <Info key={e.label} label={e.label} value={e.value} />
              ))}
            </CardContent>
          </Card>

          <OpportunityStage opportunityId={opp.id} stage={opp.stage} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{st("rfqs.sectionTitle", "RFQs")}</CardTitle>
              <Link href={`/app/rfqs/new?opportunityId=${opp.id}`}>
                <Button size="sm" variant="outline">{st("rfqs.newButton", "New RFQ")}</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {opp.rfqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{st("opportunities.noRfqs", "No RFQs yet for this opportunity.")}</p>
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
                          <div className="text-xs text-muted-foreground">{st("common.due", "Due {date}", { date: formatDate(r.dueDate) })}</div>
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
              <CardTitle>{st("quotations.sectionTitle", "Quotations")}</CardTitle>
            </CardHeader>
            <CardContent>
              {opp.quotations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{st("opportunities.noQuotations", "No quotations yet.")}</p>
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

          <ActivityPanel entity="opportunity" entityId={opp.id} />

          <RecordAuditTrail organizationId={session.user.organizationId} entityType="OPPORTUNITY" entityId={opp.id} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{st("opportunities.customerPanelTitle", "Customer")}</CardTitle>
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

          <ThreadTimeline entityType="OPPORTUNITY" entityId={opp.id} />
          <ThreadHistory entityType="OPPORTUNITY" entityId={opp.id} />
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
