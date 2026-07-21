"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Icon } from "@/components/app/icon";
import { useI18n } from "@/components/i18n/provider";

/** Pinned on the bar; everything else lives behind “More”. */
const PRIMARY = ["/app", "/app/leads", "/app/pipeline", "/app/quotations"];

const PRIMARY_ITEMS = PRIMARY.map((href) => NAV_ITEMS.find((i) => i.href === href)!).map((i) =>
  i.href === "/app" ? { ...i, label: "Home" } : i
);
const MORE_ITEMS = NAV_ITEMS.filter((i) => !PRIMARY.includes(i.href));

/**
 * href → i18n key (`nav` namespace, server-hydrated). `/app` maps to nav.home
 * because the pinned bar surfaces it as "Home" (not "Dashboard"). Hrefs with no
 * entry (the "Manz AI" brand surface) fall back to their English NAV_ITEMS label.
 */
const NAV_KEY_BY_HREF: Record<string, string> = {
  "/app": "nav.home",
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

/**
 * Non-module surfaces that are always visible regardless of role. Every other
 * NAV_ITEMS href is gated on `allowedHrefs`, which the layout derives from the
 * server-only permission matrix (see MODULE_BY_HREF in @/lib/permissions).
 */
const ALWAYS_VISIBLE_HREFS = ["/app", "/app/ai", "/app/releases"];

export function MobileNav({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const pathname = usePathname();
  const { tx } = useI18n();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Localized label for a nav href. tx keeps the English NAV_ITEMS label as the
  // fallback, so nav never regresses to a lowercased key on an unseeded database.
  const labelFor = (href: string, fallback: string) => {
    const key = NAV_KEY_BY_HREF[href];
    return key ? tx(key, fallback) : fallback;
  };

  // Navigating anywhere closes the sheet.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  // Contract: `allowedHrefs` undefined → show everything (backward safe). When
  // provided, an item renders only if it's an always-visible surface or the
  // layout included its href in the allow-list. Applied to BOTH the pinned bar
  // and the More sheet.
  const isVisible = (href: string) =>
    !allowedHrefs || ALWAYS_VISIBLE_HREFS.includes(href) || allowedHrefs.includes(href);
  const primaryItems = PRIMARY_ITEMS.filter((i) => isVisible(i.href));
  const moreItems = MORE_ITEMS.filter((i) => isVisible(i.href));

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
  const moreActive = moreItems.some((i) => isActive(i.href));

  return (
    <>
      {/* ------- “More” sheet: every destination not pinned on the bar ------- */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label={tx("chrome.closeMenu", "Close menu")}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            {/* positioning lives on this plain wrapper — framer-motion owns the
                inner transform, so animating the same element would clobber
                the -translate-x-1/2 centering */}
            <div className="fixed bottom-[4.75rem] left-1/2 z-40 w-[94%] max-w-md -translate-x-1/2 md:hidden">
            <motion.div
              className="rounded-2xl border bg-card/95 p-3 shadow-lg supports-[backdrop-filter]:bg-card/90"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
            >
              <div className="grid grid-cols-4 gap-1">
                {moreItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center text-[10px] font-medium leading-tight transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                      {labelFor(item.href, item.label)}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ----------------------------- bottom bar ---------------------------- */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[94%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border bg-card/95 supports-[backdrop-filter]:bg-card/85 p-1.5 shadow-md md:hidden">
        {primaryItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {labelFor(item.href, item.label)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label={tx("chrome.moreNavigation", "More navigation")}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
            moreOpen || moreActive
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon name="LayoutGrid" className="h-4 w-4" />
          {tx("nav.more", "More")}
        </button>
      </nav>
    </>
  );
}
