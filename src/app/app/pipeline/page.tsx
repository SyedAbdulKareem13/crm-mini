import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "OPPORTUNITIES", "read"));
  if (denied) redirect("/app");
  const opps = await prisma.opportunity.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      customer: { select: { name: true } },
      owner: { select: { name: true, image: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Drag deals across stages — values, probability and aging update live."
        descriptionKey="pipeline.boardDescription"
      />
      <PipelineBoard initialOpportunities={JSON.parse(JSON.stringify(opps))} />
    </>
  );
}
