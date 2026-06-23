"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/app/icon";

const MOBILE_ITEMS = [
  { href: "/app", label: "Home", icon: "LayoutDashboard" },
  { href: "/app/leads", label: "Leads", icon: "Sparkles" },
  { href: "/app/pipeline", label: "Pipeline", icon: "Kanban" },
  { href: "/app/rfqs", label: "RFQs", icon: "FileText" },
  { href: "/app/quotations", label: "Quotes", icon: "Receipt" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 flex w-[94%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border bg-card/95 supports-[backdrop-filter]:bg-card/85 p-1.5 shadow-md lg:hidden">
      {MOBILE_ITEMS.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
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
    </nav>
  );
}
