"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeDef = { value: string; label: string; color: string; dark?: boolean };

const LIGHT_ACCENTS: ThemeDef[] = [
  { value: "platinum", label: "Platinum", color: "#FF5C5C" },
  { value: "sapphire", label: "Sapphire", color: "#5B7CFF" },
  { value: "emerald", label: "Emerald", color: "#10B981" },
  { value: "amber", label: "Amber", color: "#F59E0B" },
  { value: "violet", label: "Violet", color: "#8B5CF6" },
];
const DARK_THEMES: ThemeDef[] = [
  { value: "graphite", label: "Graphite", color: "#FF6B6B", dark: true },
  { value: "dark", label: "Midnight", color: "#8B5CF6", dark: true },
];
const CLASSIC: ThemeDef[] = [{ value: "light", label: "Light", color: "#111111" }];

function Swatch({ t }: { t: ThemeDef }) {
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
      style={{
        background: t.dark
          ? `radial-gradient(circle at 30% 30%, #2A2D34, #0B0C10)`
          : t.value === "light"
          ? "#ffffff"
          : t.color,
        boxShadow: t.value === "light" ? "inset 0 0 0 1px #e2e2dc" : undefined,
      }}
    >
      {t.dark ? (
        <span className="block h-full w-full rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${t.color}66` }} />
      ) : null}
    </span>
  );
}

export function ThemeMenu({ align = "end" }: { align?: "start" | "end" | "center" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const renderItems = (items: ThemeDef[]) =>
    items.map((t) => {
      const active = mounted && theme === t.value;
      return (
        <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)} className="gap-2.5">
          <Swatch t={t} />
          <span className="flex-1">{t.label}</span>
          {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
        </DropdownMenuItem>
      );
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label="Theme & accent"
      >
        <Palette className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel>Light accents</DropdownMenuLabel>
        {renderItems(LIGHT_ACCENTS)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Dark</DropdownMenuLabel>
        {renderItems(DARK_THEMES)}
        <DropdownMenuSeparator />
        {renderItems(CLASSIC)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
