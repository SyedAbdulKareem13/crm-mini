"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Icon } from "@/components/app/icon";
import { Logo } from "@/components/brand/logo";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card/95 supports-[backdrop-filter]:bg-card/80 lg:flex lg:flex-col">
      <Link href="/app" className="flex h-16 items-center border-b px-5">
        <Logo />
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname === item.href || pathname.startsWith(item.href + "/");
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
                  className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-r from-primary/15 to-primary/0 ring-1 ring-primary/20"
                  transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                />
              )}
              <Icon name={item.icon} className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/0 p-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Pro tip</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd> anywhere to search.
        </p>
      </div>
    </aside>
  );
}
