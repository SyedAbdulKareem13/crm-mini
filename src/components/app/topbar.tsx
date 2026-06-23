"use client";

import { signOut } from "next-auth/react";
import { Bell, Moon, Search, Sun, LogOut, User as UserIcon, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/app/command-palette";
import { useState } from "react";
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

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-accent/60">
            <Avatar className="h-8 w-8">
              {user.image ? <AvatarImage src={user.image} alt={user.name ?? ""} /> : null}
              <AvatarFallback>{initials(user.name ?? user.email ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left text-sm md:block">
              <div className="font-medium leading-tight">{user.name ?? "User"}</div>
              <div className="text-xs text-muted-foreground leading-tight">{user.email}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuItem>
              <UserIcon /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
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
