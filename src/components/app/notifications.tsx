"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export function Notifications() {
  const router = useRouter();
  const { tx } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent — bell stays in last-known state
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount for the count.
  useEffect(() => {
    void load();
  }, [load]);

  // Re-fetch each time the panel opens.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void load();
    },
    [load]
  );

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
    } catch {
      void load();
    }
  }, [load]);

  const handleClick = useCallback(
    async (n: Notification) => {
      if (!n.readAt) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        try {
          await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
        } catch {
          // ignore — UI already reflects read
        }
      }
      if (n.url) {
        setOpen(false);
        router.push(n.url);
      }
    },
    [router]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? tx("chrome.notifUnreadAria", "Notifications, {count} unread", { count: unreadCount })
              : tx("common.notifications", "Notifications")
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">{tx("common.notifications", "Notifications")}</div>
          {unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {tx("chrome.markAllRead", "Mark all read")}
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {loading ? tx("common.loading", "Loading…") : tx("chrome.notifEmpty", "You're all caught up")}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const unread = !n.readAt;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                        unread && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          unread ? "bg-primary" : "bg-transparent"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            unread ? "font-semibold" : "font-medium"
                          )}
                        >
                          {n.title}
                        </span>
                        {n.body ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                            {n.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
