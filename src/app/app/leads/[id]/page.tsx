import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConvertLeadButton } from "./convert-button";
import { LeadEditButton } from "@/components/leads/lead-edit-button";
import { RecordAuditTrail } from "@/components/audit/record-audit-trail";
import { ActivityPanel } from "@/components/activity/activity-panel";
import { LifecycleHeader } from "@/components/lifecycle/lifecycle-header";
import { ThreadTimeline } from "@/components/lifecycle/thread-insights";
import { getLifecycleThread } from "@/lib/lifecycle";
import { getModuleConfig } from "@/lib/field-config";
import { formatCompactCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      owner: { select: { name: true } },
      activities: { orderBy: { createdAt: "desc" } },
      documents: true,
    },
  });
  if (!lead) notFound();

  const thread = await getLifecycleThread(session.user.organizationId, { type: "LEAD", id });

  const leadForEdit = {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    contactPerson: lead.contactPerson,
    email: lead.email,
    mobile: lead.mobile,
    source: lead.source,
    industry: lead.industry,
    status: lead.status,
    notes: lead.notes,
    expectedRevenue: lead.expectedRevenue != null ? Number(lead.expectedRevenue) : null,
    data: (lead.data as Record<string, unknown> | null) ?? null,
  };

  // Admin-defined custom field values, labelled from the LEAD field config.
  const leadConfig = await getModuleConfig(session.user.organizationId, "LEAD");
  const customEntries = Object.entries(leadForEdit.data ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ({
      label: leadConfig.find((f) => f.fieldKey === k)?.label ?? k.replace(/^custom_/, "").replace(/_/g, " "),
      value: String(v),
    }));

  return (
    <div>
      <Link href="/app/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All leads
      </Link>

      {thread && (
        <div className="mt-4">
          <LifecycleHeader
            thread={thread}
            entity={{ type: "LEAD", id: lead.id, status: lead.status }}
            viewerRole={session.user.role ?? ""}
            cancelInfo={
              lead.cancelledAt
                ? {
                    at: lead.cancelledAt.toISOString(),
                    by: lead.cancelledByName,
                    reason: lead.cancelReason,
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
                  <CardTitle>{lead.name}</CardTitle>
                  <Badge variant="soft">{lead.leadNumber}</Badge>
                  <Badge variant="outline">{lead.status.toLowerCase()}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{lead.company}</div>
              </div>
              <div className="flex gap-2">
                <LeadEditButton lead={leadForEdit} />
                <ConvertLeadButton leadId={lead.id} disabled={!!lead.convertedOpportunityId} />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <Info icon={<User className="h-4 w-4" />} label="Owner" value={lead.owner?.name ?? "Unassigned"} />
              <Info icon={<Building2 className="h-4 w-4" />} label="Industry" value={lead.industry ?? "—"} />
              <Info icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email ?? "—"} />
              <Info icon={<Phone className="h-4 w-4" />} label="Mobile" value={lead.mobile ?? "—"} />
              <Info label="Source" value={lead.source.toLowerCase().replace("_", " ")} />
              <Info label="Expected" value={formatCompactCurrency(lead.expectedRevenue ? Number(lead.expectedRevenue) : 0)} />
              <Info label="Created" value={formatDate(lead.createdAt)} />
              <Info label="Updated" value={formatDate(lead.updatedAt)} />
              {customEntries.map((e) => (
                <Info key={e.label} label={e.label} value={e.value} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lead.notes ?? "No notes yet."}
              </p>
            </CardContent>
          </Card>

          <ActivityPanel entity="lead" entityId={lead.id} />
        </div>

        <div className="space-y-4">
          <ThreadTimeline entityType="LEAD" entityId={lead.id} />
          <RecordAuditTrail organizationId={session.user.organizationId} entityType="LEAD" entityId={lead.id} />
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium capitalize">{value}</div>
    </div>
  );
}
