import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileNav } from "@/components/app/mobile-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { MustChangePasswordBanner } from "@/components/admin/onboard-employee";
import { readableModules, MODULE_BY_HREF } from "@/lib/permissions";
import {
  getUserLocalePreference,
  getBundle,
  resolveDirection,
  getEnabledLanguages,
} from "@/lib/i18n/server";
import { CORE_NAMESPACES, NO_SECONDARY } from "@/lib/i18n/config";
import type { Bundle } from "@/lib/i18n/types";
import { I18nProvider } from "@/components/i18n/provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch, in parallel, everything that only needs the user id:
  //  - dbUser: avatar/name/role for the topbar (avatar is NOT in the session JWT
  //    — that would bloat the auth cookie — so it's read here).
  //  - pref: the validated locale preference (production gate + English fallback
  //    are enforced inside getUserLocalePreference).
  //  - languages: the pickable languages, also used to resolve Intl locales.
  const [dbUser, pref, languages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, role: true, mustChangePassword: true },
    }),
    getUserLocalePreference(session.user.id),
    getEnabledLanguages(),
  ]);

  // Localization hydration — depends on the resolved preference. The full
  // namespace set (CORE_NAMESPACES) is server-rendered so the first paint has
  // no flash and every screen is covered with no per-page loadNamespace wiring.
  // All degrade to English/keys when the i18n tables are empty.
  const [dir, initialBundle, initialSecondaryBundle] = await Promise.all([
    resolveDirection(pref.uiLanguage),
    getBundle(pref.uiLanguage, CORE_NAMESPACES),
    pref.bilingualSecondary !== NO_SECONDARY
      ? getBundle(pref.bilingualSecondary, CORE_NAMESPACES)
      : Promise.resolve<Bundle | null>(null),
  ]);

  const byCode = new Map(languages.map((l) => [l.code, l]));
  const locale = byCode.get(pref.uiLanguage)?.locale ?? "en-US";
  const secondaryLocale =
    pref.bilingualSecondary !== NO_SECONDARY
      ? byCode.get(pref.bilingualSecondary)?.locale ?? null
      : null;

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
    <I18nProvider
      lang={pref.uiLanguage}
      secondary={pref.bilingualSecondary}
      dir={dir}
      locale={locale}
      secondaryLocale={secondaryLocale}
      languages={languages}
      initialBundle={initialBundle}
      initialSecondaryBundle={initialSecondaryBundle}
    >
      {/* dir/lang here (not on <html>) drives Tailwind rtl: variants and CSS
          [dir="rtl"] rules app-wide; the document root stays lang="en". */}
      <div className="relative min-h-screen bg-background" dir={dir} lang={pref.uiLanguage}>
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
    </I18nProvider>
  );
}
