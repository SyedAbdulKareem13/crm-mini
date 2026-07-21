import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency, formatRelativeTime } from "@/lib/utils";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "APPROVALS", "read"));
  if (denied) redirect("/app");
  const requests = await prisma.approvalRequest.findMany({
    where: { quotation: { organizationId: session.user.organizationId } },
    include: {
      quotation: { include: { customer: { select: { name: true } } } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Pending and historical approval requests across the team."
      />
      {requests.length === 0 ? (
        <EmptyState
          title="No approval requests"
          description="Submit a quotation for approval from its detail page."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/quotations/${r.quotationId}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/0 text-primary font-semibold text-xs">
                      S{r.currentStep}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {r.quotation.quotationNumber} — {r.quotation.customer.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        requested by {r.requestedBy.name} · {formatRelativeTime(r.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCompactCurrency(Number(r.quotation.grandTotal))}
                      </div>
                      <Badge
                        variant={
                          r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "destructive" : "warning"
                        }
                      >
                        {r.status.toLowerCase()}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
