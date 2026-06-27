import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileNav } from "@/components/app/mobile-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Read avatar/name from the DB (the avatar is NOT carried in the session
  // JWT — that would bloat the auth cookie — so fetch it here for the topbar).
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
  const topbarUser = {
    name: dbUser?.name ?? session.user.name ?? null,
    email: dbUser?.email ?? session.user.email ?? null,
    image: dbUser?.image ?? null,
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-50" />
      <div className="flex">
        <Sidebar />
        <div className="flex min-h-screen w-full min-w-0 flex-col">
          <Topbar user={topbarUser} />
          {/* pb on mobile clears the floating bottom nav + the home-gesture inset */}
          <main className="flex-1 px-4 py-5 pb-28 sm:py-6 lg:px-8 lg:pb-8">
            <div className="mx-auto w-full min-w-0 max-w-[1480px]">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
