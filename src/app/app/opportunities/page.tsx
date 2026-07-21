import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Kanban as KanbanIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OpportunityCreate } from "@/components/opportunities/opportunity-create";
import { can } from "@/lib/permissions";
import { getServerT } from "@/lib/i18n/server";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const { t: st } = await getServerT();
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "OPPORTUNITIES", "read"));
  if (denied) redirect("/app");

  const [opps, customers] = await Promise.all([
    prisma.opportunity.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { name: true } },
        owner: { select: { name: true } },
      },
      take: 300,
    }),
    prisma.customer.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Every active and historical deal across the business."
        descriptionKey="opportunities.description"
        actions={
          <div className="flex gap-2">
            <Link href="/app/pipeline">
              <Button variant="outline">
                <KanbanIcon className="h-4 w-4" /> {st("opportunities.pipelineView", "Pipeline view")}
              </Button>
            </Link>
            <Suspense fallback={null}>
              <OpportunityCreate customers={customers} />
            </Suspense>
          </div>
        }
      />

      {opps.length === 0 ? (
        <EmptyState
          title={st("opportunities.emptyTitle", "No opportunities yet")}
          description={st("opportunities.emptyDescription", "Create your first deal — or convert a qualified lead.")}
          action={
            <Link href="/app/leads">
              <Button variant="gradient">{st("opportunities.convertLead", "Convert a lead")}</Button>
            </Link>
          }
        />
      ) : (
        <OpportunitiesClient opps={JSON.parse(JSON.stringify(opps))} customers={customers} />
      )}
    </>
  );
}
