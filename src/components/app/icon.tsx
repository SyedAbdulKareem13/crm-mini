import {
  LayoutDashboard,
  Sparkles,
  Target,
  Kanban,
  FileText,
  Receipt,
  Building2,
  CalendarClock,
  BadgeDollarSign,
  ShieldCheck,
  BarChart3,
  Settings,
  Trophy,
  X,
  Coins,
  TrendingUp,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explicit icon registry — keeps tree-shaking working.
 * (A namespace import of lucide-react pulls 1000+ icons into the client bundle.)
 */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Sparkles,
  Target,
  Kanban,
  FileText,
  Receipt,
  Building2,
  CalendarClock,
  BadgeDollarSign,
  ShieldCheck,
  BarChart3,
  Settings,
  Trophy,
  X,
  Coins,
  TrendingUp,
  Circle,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Circle;
  return <Cmp className={cn("h-4 w-4", className)} aria-hidden />;
}
