import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { AuditLogClient } from "@/components/audit/audit-log-client";
import type { AuditEntry } from "@/components/audit/audit-trail";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "REPORTS", "read"));
  if (denied) redirect("/app");

  const rows = await prisma.auditLog.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    entityLabel: r.entityLabel,
    action: r.action,
    summary: r.summary,
    changes: (r.changes as AuditEntry["changes"]) ?? null,
    actorName: r.actorName,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Audit Log"
        urdu="آڈٹ لاگ"
        description="Every create, edit, stage move, conversion and approval across Leads, Opportunities and Quotations — fully transparent."
      />
      <AuditLogClient entries={entries} />
    </>
  );
}
