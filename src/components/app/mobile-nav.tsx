"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Icon } from "@/components/app/icon";

/** Pinned on the bar; everything else lives behind “More”. */
const PRIMARY = ["/app", "/app/leads", "/app/pipeline", "/app/quotations"];

const PRIMARY_ITEMS = PRIMARY.map((href) => NAV_ITEMS.find((i) => i.href === href)!).map((i) =>
  i.href === "/app" ? { ...i, label: "Home" } : i
);
const MORE_ITEMS = NAV_ITEMS.filter((i) => !PRIMARY.includes(i.href));

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Navigating anywhere closes the sheet.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE_ITEMS.some((i) => isActive(i.href));

  return (
    <>
      {/* ------- “More” sheet: every destination not pinned on the bar ------- */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed bottom-[4.6rem] left-1/2 z-40 w-[94%] max-w-md -translate-x-1/2 rounded-2xl border bg-card/95 p-3 shadow-lg supports-[backdrop-filter]:bg-card/90 md:hidden"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
            >
              <div className="grid grid-cols-4 gap-1">
                {MORE_ITEMS.map((item) => {
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
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ----------------------------- bottom bar ---------------------------- */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[94%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border bg-card/95 supports-[backdrop-filter]:bg-card/85 p-1.5 shadow-md md:hidden">
        {PRIMARY_ITEMS.map((item) => {
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
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label="More navigation"
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
            moreOpen || moreActive
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon name="LayoutGrid" className="h-4 w-4" />
          More
        </button>
      </nav>
    </>
  );
}
