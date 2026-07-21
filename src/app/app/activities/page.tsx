import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime, initials } from "@/lib/utils";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "ACTIVITIES", "read"));
  if (denied) redirect("/app");
  const acts = await prisma.activity.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      owner: { select: { name: true, image: true } },
      opportunity: { select: { name: true, id: true } },
      lead: { select: { name: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Activities"
        description="Calls, meetings, emails, follow-ups & tasks — a unified timeline."
      />
      {acts.length === 0 ? (
        <EmptyState
          title="No activities yet"
          description="Log a call, schedule a meeting or add a task from any lead or opportunity."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y">
              {acts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-4">
                  <Avatar className="h-9 w-9">
                    {a.owner?.image ? <AvatarImage src={a.owner.image} alt="" /> : null}
                    <AvatarFallback>{initials(a.owner?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="soft" className="capitalize">{a.type.toLowerCase()}</Badge>
                      <span className="truncate text-sm font-medium">{a.subject}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.opportunity?.name ?? a.lead?.name ?? "—"} · {formatRelativeTime(a.createdAt)}
                    </div>
                  </div>
                  <Badge variant="outline">{a.status.toLowerCase()}</Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </>
  );
}
