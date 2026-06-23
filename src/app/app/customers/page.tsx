import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { CustomerCreate } from "@/components/customers/customer-create";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const customers = await prisma.customer.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { opportunities: true, rfqs: true, quotations: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Master records, contacts, billing details and engagement summary."
        actions={
          <Suspense fallback={null}>
            <CustomerCreate />
          </Suspense>
        }
      />
      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customers are auto-created when you convert leads. Or create one manually."
          icon={<Building2 className="h-7 w-7" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/app/customers/${c.id}`}>
              <Card className="transition-transform hover:-translate-y-0.5 hover:shadow-glow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/0 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.industry ?? "—"}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">{c._count.opportunities} opps</Badge>
                    <Badge variant="outline">{c._count.rfqs} RFQs</Badge>
                    <Badge variant="outline">{c._count.quotations} quotes</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
