import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConvertLeadButton } from "./convert-button";
import { LeadEditButton } from "@/components/leads/lead-edit-button";
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
  };

  return (
    <div>
      <Link href="/app/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All leads
      </Link>

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
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l pl-4">
                  {lead.activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
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
