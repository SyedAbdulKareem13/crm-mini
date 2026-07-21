import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkloadBoard, type WorkloadTask, type WorkloadMember } from "@/components/projects/workload-board";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** Resource workload — every member's task allocation across all projects. */
export default async function WorkloadPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "PROJECTS", "read"));
  if (denied) redirect("/app");
  const orgId = session.user.organizationId;

  const [members, projects] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] } },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        startDate: true,
        phases: {
          orderBy: { position: "asc" },
          select: {
            name: true,
            durationWeeks: true,
            startDate: true,
            endDate: true,
            deliverables: {
              select: {
                id: true,
                name: true,
                status: true,
                priority: true,
                ownerId: true,
                startDate: true,
                endDate: true,
                progressPct: true,
                estimateHours: true,
                actualHours: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Resolve each task's window the same way the Gantt derives it (explicit
  // dates override; otherwise the task spans its phase window).
  const tasks: WorkloadTask[] = [];
  for (const project of projects) {
    let cursor = startOfDay(project.startDate ?? new Date());
    for (const phase of project.phases) {
      const pStart = phase.startDate ? startOfDay(phase.startDate) : cursor;
      const pEndRaw = phase.endDate
        ? startOfDay(phase.endDate)
        : addDays(pStart, Math.max(1, phase.durationWeeks) * 7);
      const pEnd = pEndRaw <= pStart ? addDays(pStart, 7) : pEndRaw;
      cursor = pEnd;
      for (const d of phase.deliverables) {
        const ds = d.startDate ? startOfDay(d.startDate) : pStart;
        const deRaw = d.endDate ? startOfDay(d.endDate) : d.startDate ? addDays(ds, 7) : pEnd;
        const de = deRaw < ds ? addDays(ds, 1) : deRaw;
        tasks.push({
          id: d.id,
          name: d.name,
          status: d.status,
          priority: d.priority,
          ownerId: d.ownerId,
          progressPct: d.progressPct,
          estimateHours: d.estimateHours,
          actualHours: d.actualHours,
          start: ds.toISOString(),
          end: de.toISOString(),
          projectId: project.id,
          projectNumber: project.projectNumber,
          projectName: project.name,
          phaseName: phase.name,
        });
      }
    }
  }

  const board: WorkloadMember[] = members.map((m) => ({
    id: m.id,
    name: m.name ?? m.email ?? "Member",
  }));

  return (
    <div>
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight">
            <span className="flex items-center gap-2">
              <Users2 className="h-6 w-6 text-primary" /> Resource workload
            </span>
            <span dir="rtl" className="font-urdu text-base text-muted-foreground">ورک لوڈ</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-member allocation across every active project — spot overload before it bites.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <WorkloadBoard members={board} tasks={tasks} />
      </div>
    </div>
  );
}
