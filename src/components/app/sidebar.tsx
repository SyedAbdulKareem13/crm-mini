"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Icon } from "@/components/app/icon";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/components/i18n/provider";

/**
 * Non-module surfaces that are always visible regardless of role. Every other
 * NAV_ITEMS href is gated on `allowedHrefs`, which the layout derives from the
 * server-only permission matrix (see MODULE_BY_HREF in @/lib/permissions).
 */
const ALWAYS_VISIBLE_HREFS = ["/app", "/app/ai", "/app/releases"];

/**
 * NAV_ITEMS href → i18n key (`nav` namespace, server-hydrated on first paint).
 * Labels render via t(key) so Full-Arabic shows Arabic. Hrefs without an entry
 * (the "Manz AI" brand surface) keep their English NAV_ITEMS label untouched.
 */
const NAV_KEY_BY_HREF: Record<string, string> = {
  "/app": "nav.dashboard",
  "/app/leads": "nav.leads",
  "/app/opportunities": "nav.opportunities",
  "/app/pipeline": "nav.pipeline",
  "/app/rfqs": "nav.rfqs",
  "/app/quotations": "nav.quotations",
  "/app/projects": "nav.projects",
  "/app/customers": "nav.customers",
  "/app/activities": "nav.activities",
  "/app/rate-cards": "nav.rateCards",
  "/app/approvals": "nav.approvals",
  "/app/reports": "nav.reports",
  "/app/audit": "nav.audit",
  "/app/releases": "nav.releases",
  "/app/admin": "nav.admin",
};

export function Sidebar({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const pathname = usePathname();
  const { tx } = useI18n();

  // Pro-tip hint splits around a {key} slot so the ⌘K keycap stays an inline
  // <kbd> element while the surrounding sentence localizes.
  const proTip = tx("chrome.proTipBody", "Press {key} anywhere to search.");
  const [proTipBefore, proTipAfter] = proTip.split("{key}");

  // Contract: `allowedHrefs` undefined → show everything (backward safe). When
  // provided, an item renders only if it's an always-visible surface or the
  // layout included its href in the allow-list.
  const items = NAV_ITEMS.filter(
    (item) =>
      !allowedHrefs ||
      ALWAYS_VISIBLE_HREFS.includes(item.href) ||
      allowedHrefs.includes(item.href)
  );

  return (
    // md (768px), not lg: phones in "desktop site" mode (~980px viewport) and
    // tablets must still get the full navigation. Below md the MobileNav
    // bottom bar (with its More sheet) covers every destination.
    // Under RTL the layout's flex row places this aside on the right, so the
    // divider must sit on its inner (left) edge — swap border-r → border-l.
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r rtl:border-l rtl:border-r-0 bg-card/95 supports-[backdrop-filter]:bg-card/80 md:flex md:flex-col">
      <Link href="/app" className="flex h-16 items-center border-b px-5">
        <Logo crmSuiteLabel={tx("chrome.crmSuite", "CRM Suite")} />
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {items.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const navKey = NAV_KEY_BY_HREF[item.href];
          // tx keeps the English NAV_ITEMS label as the fallback, so nav never
          // regresses to a lowercased key even on an unseeded database.
          const label = navKey ? tx(navKey, item.label) : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-r rtl:bg-gradient-to-l from-primary/15 to-primary/0 ring-1 ring-primary/20"
                  transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                />
              )}
              <Icon name={item.icon} className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/0 p-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          {tx("chrome.proTipTitle", "Pro tip")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {proTipBefore}
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          {proTipAfter ?? ""}
        </p>
      </div>
    </aside>
  );
}
