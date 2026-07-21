import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileNav } from "@/components/app/mobile-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { MustChangePasswordBanner } from "@/components/admin/onboard-employee";
import { readableModules, MODULE_BY_HREF } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Read avatar/name from the DB (the avatar is NOT carried in the session
  // JWT — that would bloat the auth cookie — so fetch it here for the topbar).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, role: true, mustChangePassword: true },
  });
  const topbarUser = {
    name: dbUser?.name ?? session.user.name ?? null,
    email: dbUser?.email ?? session.user.email ?? null,
    image: dbUser?.image ?? null,
  };

  // Nav gating: the hrefs this role is allowed to READ. The Sidebar/MobileNav
  // accept an optional allowedHrefs prop (added by the nav agent) and filter
  // against it. ADMIN receives every module.
  const orgId = session.user.organizationId ?? null;
  const modules = orgId ? await readableModules(orgId, dbUser?.role ?? session.user.role) : [];
  const moduleSet = new Set(modules);
  const allowedHrefs = Object.entries(MODULE_BY_HREF)
    .filter(([, mod]) => moduleSet.has(mod))
    .map(([href]) => href);

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-50" />
      {dbUser?.mustChangePassword && <MustChangePasswordBanner />}
      <div className="flex">
        <Sidebar allowedHrefs={allowedHrefs} />
        {/* min-w-0: as a flex item beside the sidebar this column must be able
            to shrink below its content's intrinsic width (wide Gantt/tables
            scroll internally instead of stretching the page). */}
        <div className="flex min-h-screen w-full min-w-0 flex-col">
          <Topbar user={topbarUser} />
          {/* pb-24 below md: keep content clear of the fixed bottom nav bar */}
          <main className="flex-1 px-4 py-6 pb-24 md:pb-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1480px]">
              <AppBreadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav allowedHrefs={allowedHrefs} />
    </div>
  );
}
