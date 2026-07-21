import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, ArrowRight, Users2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { computeProjectHealth, HEALTH_META } from "@/lib/project-health";
import { cn, formatDate } from "@/lib/utils";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; variant: "soft" | "success" | "warning" | "outline" }> = {
  PLANNING: { label: "Planning", variant: "soft" },
  ACTIVE: { label: "Active", variant: "success" },
  ON_HOLD: { label: "On hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "PROJECTS", "read"));
  if (denied) redirect("/app");

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      customer: { select: { name: true } },
      opportunity: { select: { id: true, oppNumber: true } },
      methodology: { select: { name: true } },
      transformationType: { select: { name: true, subtitle: true } },
      owner: { select: { name: true } },
      phases: {
        select: {
          status: true,
          durationWeeks: true,
          startDate: true,
          endDate: true,
          deliverables: { select: { status: true, endDate: true } },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight">
            Projects
            <span dir="rtl" className="font-urdu text-base text-muted-foreground">پروجیکٹس</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SAP transformation projects converted from opportunities — each runs a configurable Activate roadmap.
          </p>
        </div>
        <Link
          href="/app/projects/workload"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-card/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Users2 className="h-4 w-4 text-primary" /> Workload
        </Link>
      </div>

      {projects.length > 0 && (() => {
        // Portfolio summary strip — health computed the same way as the cards.
        const healths = projects.map((p) => computeProjectHealth(p.status, p.startDate, p.phases));
        const stats = [
          { label: "Total", value: projects.length, cls: "" },
          { label: "Active", value: projects.filter((p) => p.status === "ACTIVE").length, cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "At risk", value: healths.filter((h) => h === "AT_RISK").length, cls: "text-amber-600 dark:text-amber-400" },
          { label: "Delayed", value: healths.filter((h) => h === "DELAYED").length, cls: "text-destructive" },
          { label: "Completed", value: projects.filter((p) => p.status === "COMPLETED").length, cls: "text-muted-foreground" },
        ];
        return (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card/60 px-4 py-3">
                <div className={cn("font-display text-2xl font-semibold tabular-nums", s.cls)}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Open an opportunity and use <span className="font-medium text-foreground">Create project</span> to convert
            it into an SAP transformation project with its roadmap.
          </p>
          <Link
            href="/app/opportunities"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Go to opportunities <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mz-stagger mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.PLANNING;
            const total = p.phases.length;
            const done = p.phases.filter((ph) => ph.status === "COMPLETED").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const health = computeProjectHealth(p.status, p.startDate, p.phases);
            const healthMeta = HEALTH_META[health];
            return (
              <Link key={p.id} href={`/app/projects/${p.id}`} className="group">
                <Card className="luxury-card hover-lift h-full overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold" title={p.name}>{p.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {p.projectNumber}
                          {p.customer ? <> · {p.customer.name}</> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {(health === "AT_RISK" || health === "DELAYED") && (
                          <Badge
                            variant={health === "AT_RISK" ? "warning" : "outline"}
                            className={cn(health === "DELAYED" && "border-destructive/50 text-destructive")}
                          >
                            {healthMeta.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.transformationType && (
                        <Badge variant="outline" className="font-normal">
                          {p.transformationType.name}
                          {p.transformationType.subtitle ? ` · ${p.transformationType.subtitle}` : ""}
                        </Badge>
                      )}
                      {p.methodology && (
                        <Badge variant="soft" className="font-normal">{p.methodology.name}</Badge>
                      )}
                    </div>

                    {/* Phase progress */}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {done}/{total} phases complete
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--chart-1))] to-[hsl(var(--chart-5))] transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.owner?.name ?? "Unassigned"}</span>
                      <span>{p.startDate ? `Started ${formatDate(p.startDate)}` : `Created ${formatDate(p.createdAt)}`}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
