"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";

export function UpcomingTasks({
  tasks,
}: {
  tasks: Array<{ id: string; subject: string; dueAt: Date | null; type: string }>;
}) {
  const { tx, formatDate } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("dashboard.upcomingTasks.title", "Upcoming follow-ups")}</CardTitle>
        <CardDescription>{tx("dashboard.upcomingTasks.subtitle", "What needs your attention next")}</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState
            title={tx("dashboard.upcomingTasks.emptyTitle", "All clear")}
            description={tx("dashboard.upcomingTasks.emptyDesc", "No follow-ups due — well played.")}
            icon={<CheckCircle2 className="h-7 w-7" />}
          />
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {t.type.toLowerCase().replace("_", " ")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{t.dueAt ? formatDate(t.dueAt) : "—"}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
