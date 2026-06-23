"use client";

import { signOut } from "next-auth/react";
import { Moon, Search, Sun, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Notifications } from "@/components/app/notifications";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/app/command-palette";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function Topbar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

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
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              <UserIcon /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
