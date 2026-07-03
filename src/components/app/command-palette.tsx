"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/constants";
import { Icon } from "@/components/app/icon";
import {
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Target,
  Building2,
  FileText,
  Receipt,
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ManzOrb } from "@/components/app/manz-orb";

type SearchResult = {
  type: "lead" | "opportunity" | "customer" | "rfq" | "quotation";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const RESULT_ICON: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  lead: Sparkles,
  opportunity: Target,
  customer: Building2,
  rfq: FileText,
  quotation: Receipt,
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Live record search (debounced) across leads / opps / customers / RFQs / quotes.
  useEffect(() => {
    if (!open) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          setResults((data?.results as SearchResult[]) ?? []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 220);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [query, open]);

  // Reset the query whenever the palette closes.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  /** Manz AI: turn the typed sentence into a logged activity on the right record. */
  function aiLogActivity() {
    const prompt = query.trim();
    onOpenChange(false);
    toast.promise(
      fetch("/api/ai/create-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Couldn't log that");
        return data as {
          activity: { subject: string; type: string };
          target: { label: string; href: string };
        };
      }),
      {
        loading: "Manz AI is logging that…",
        success: (data) => {
          router.push(data.target.href);
          router.refresh();
          return `Logged ${data.activity.type.toLowerCase().replace("_", " ")} “${data.activity.subject}” on ${data.target.label}`;
        },
        error: (e: Error) => e.message,
      }
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search records, or type a command…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </span>
          ) : (
            "No results found."
          )}
        </CommandEmpty>
        {query.trim().length >= 6 && (
          <CommandGroup heading="Manz AI">
            <CommandItem value={`manz-ai-log ${query}`} onSelect={aiLogActivity}>
              <ManzOrb size={18} />
              <span className="truncate">
                Log activity: <span className="font-medium">“{query.trim()}”</span>
              </span>
              <span className="ml-auto pl-3 text-xs text-muted-foreground">✨ AI</span>
            </CommandItem>
          </CommandGroup>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Records">
            {results.map((r) => {
              const Ico = RESULT_ICON[r.type];
              return (
                <CommandItem
                  key={`${r.type}-${r.id}`}
                  value={`${r.title} ${r.subtitle} ${query}`}
                  onSelect={() => go(r.href)}
                >
                  <Ico className="h-4 w-4" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/app/leads?new=1")}>
            <Icon name="Sparkles" /> Create lead
            <CommandShortcut>L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/opportunities?new=1")}>
            <Icon name="Target" /> Create opportunity
            <CommandShortcut>O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/rfqs?new=1")}>
            <Icon name="FileText" /> Create RFQ
          </CommandItem>
          <CommandItem onSelect={() => go("/app/quotations?new=1")}>
            <Icon name="Receipt" /> Create quotation
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Preferences">
          <CommandItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun /> : <Moon />} Toggle theme
          </CommandItem>
          <CommandItem onSelect={() => signOut({ callbackUrl: "/login" })}>
            <LogOut /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
