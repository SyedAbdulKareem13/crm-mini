import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecordAuditTrail } from "@/components/audit/record-audit-trail";
import { ProjectPlanner, type PlannerProject } from "@/components/projects/project-planner";
import type { SavedEstimate } from "@/components/projects/project-estimator";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      customer: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true, oppNumber: true, stage: true } },
      methodology: { select: { name: true } },
      transformationType: { select: { name: true, subtitle: true } },
      owner: { select: { name: true } },
      phases: {
        orderBy: { position: "asc" },
        include: {
          deliverables: {
            orderBy: { position: "asc" },
            include: {
              owner: { select: { id: true, name: true } },
              predecessors: { select: { predecessorId: true } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();

  // Org members for deliverable assignment in the planner/Gantt.
  const members = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Saved estimator run + schedule baseline live in the project's JSON data column.
  const rawData =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  const estimate: SavedEstimate = (rawData.estimator as SavedEstimate) ?? null;
  const baseline = (rawData.baseline as import("@/components/projects/project-gantt").BaselineData | undefined) ?? null;

  const planner: PlannerProject = {
    id: project.id,
    projectNumber: project.projectNumber,
    name: project.name,
    status: project.status,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    targetEndDate: project.targetEndDate ? project.targetEndDate.toISOString() : null,
    notes: project.notes,
    customer: project.customer ? { id: project.customer.id, name: project.customer.name } : null,
    opportunity: project.opportunity
      ? {
          id: project.opportunity.id,
          name: project.opportunity.name,
          oppNumber: project.opportunity.oppNumber,
          stage: project.opportunity.stage,
        }
      : null,
    methodologyName: project.methodology?.name ?? null,
    transformationType: project.transformationType
      ? { name: project.transformationType.name, subtitle: project.transformationType.subtitle }
      : null,
    ownerName: project.owner?.name ?? null,
    phases: project.phases.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      durationWeeks: p.durationWeeks,
      position: p.position,
      status: p.status,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      deliverables: p.deliverables.map((d) => ({
        id: d.id,
        name: d.name,
        position: d.position,
        status: d.status,
        priority: d.priority,
        ownerId: d.ownerId,
        ownerName: d.owner?.name ?? null,
        startDate: d.startDate ? d.startDate.toISOString() : null,
        endDate: d.endDate ? d.endDate.toISOString() : null,
        progressPct: d.progressPct,
        estimateHours: d.estimateHours,
        actualHours: d.actualHours,
        predecessorIds: d.predecessors.map((x) => x.predecessorId),
      })),
    })),
  };

  return (
    <div>
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <div className="mt-4 space-y-6">
        <ProjectPlanner
          project={planner}
          members={members}
          estimate={estimate}
          baseline={baseline}
          viewer={{ id: session.user.id, name: session.user.name ?? "Member" }}
        />
        <RecordAuditTrail
          organizationId={session.user.organizationId}
          entityType="PROJECT"
          entityId={project.id}
        />
      </div>
    </div>
  );
}
