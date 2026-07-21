"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime, initials } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

export function RecentActivities({
  activities,
}: {
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    createdAt: Date;
    owner: { name: string | null; image: string | null } | null;
  }>;
}) {
  const { tx } = useI18n();
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tx("dashboard.recentActivities.title", "Recent activities")}</CardTitle>
          <CardDescription>{tx("dashboard.recentActivities.subtitle", "Your team's latest moves")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={tx("dashboard.recentActivities.emptyTitle", "No activities yet")}
            description={tx("dashboard.recentActivities.emptyDesc", "Calls, meetings and notes will appear here.")}
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("dashboard.recentActivities.title", "Recent activities")}</CardTitle>
        <CardDescription>{tx("dashboard.recentActivities.subtitle", "Your team's latest moves")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border bg-card/40 p-3">
              <Avatar className="h-9 w-9">
                {a.owner?.image ? <AvatarImage src={a.owner.image} alt="" /> : null}
                <AvatarFallback>{initials(a.owner?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="soft">{a.type.toLowerCase()}</Badge>
                  <span className="truncate text-sm font-medium">{a.subject}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
