"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Search, LogOut, User as UserIcon, Settings, Languages } from "lucide-react";
import { ManzOrb } from "@/components/app/manz-orb";
import { Notifications } from "@/components/app/notifications";
import { WhatsNew } from "@/components/app/whats-new";
import { ThemeMenu } from "@/components/theme-menu";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/app/command-palette";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useI18n } from "@/components/i18n/provider";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function Topbar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  // Prefer a real translation; fall back to clean English when a key isn't
  // seeded (the provider otherwise surfaces the raw key segment).
  const tx = (key: string, english: string) => {
    const value = t(key);
    return value === (key.split(".").pop() ?? key) ? english : value;
  };

  // Live avatar/name — updated instantly when the profile is saved in Settings.
  const [image, setImage] = useState<string | null>(user.image ?? null);
  const [name, setName] = useState<string | null>(user.name ?? null);
  useEffect(() => {
    setImage(user.image ?? null);
    setName(user.name ?? null);
  }, [user.image, user.name]);
  useEffect(() => {
    function onProfile(e: Event) {
      const detail = (e as CustomEvent).detail as { image?: string | null; name?: string | null };
      if (detail?.image !== undefined) setImage(detail.image ?? null);
      if (detail?.name) setName(detail.name);
    }
    window.addEventListener("manzil:profile", onProfile);
    return () => window.removeEventListener("manzil:profile", onProfile);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 supports-[backdrop-filter]:bg-background/80 px-4 lg:px-8">
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex w-full max-w-md items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm text-muted-foreground hover:bg-card transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search leads, opportunities, customers…</span>
        <span className="sm:hidden">Search</span>
        <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/app/ai"
          aria-label="Manz AI"
          title="Manz AI"
          className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "linear-gradient(120deg, hsl(var(--chart-1)/.18), hsl(var(--chart-5)/.18))" }}
          />
          <ManzOrb size={20} className="transition-transform duration-300 group-hover:scale-110" />
          <span className="hidden sm:inline">Manz AI</span>
        </Link>

        <ThemeMenu />

        <WhatsNew />

        <Notifications />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-accent/60">
            <Avatar className="h-8 w-8">
              {image ? <AvatarImage src={image} alt={name ?? ""} /> : null}
              <AvatarFallback>{initials(name ?? user.email ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left text-sm md:block">
              <div className="font-medium leading-tight">{name ?? "User"}</div>
              <div className="text-xs text-muted-foreground leading-tight">{user.email}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              <UserIcon /> {tx("common.profile", "Profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              <Settings /> {tx("common.settings", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLangOpen(true)}>
              <Languages /> {tx("common.language", "Language")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut /> {tx("common.signOut", "Sign out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <LanguageSelector open={langOpen} onOpenChange={setLangOpen} />
    </header>
  );
}
