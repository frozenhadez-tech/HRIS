import Link from "next/link";
import { Bell, CalendarDays, UserCheck } from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { getReminders } from "@/lib/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function NotificationsPage() {
  await requireUser();
  const reminders = await getReminders();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Return-to-office dates and regularization reviews."
      />

      {reminders.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="You're all caught up"
          description="Upcoming return-to-office dates and probation reviews will show here."
        />
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => {
            const probation = r.kind === "probation";
            const Icon = probation ? UserCheck : CalendarDays;
            return (
              <Link key={r.id} href={r.href} className="block">
                <Card className="transition-colors hover:border-indigo-300">
                  <div className="flex items-start gap-3 px-5 py-4">
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        probation
                          ? "bg-blue-100 text-blue-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{r.message}</p>
                      <div className="mt-1">
                        <Badge tone={probation ? "blue" : r.scope === "self" ? "indigo" : "slate"}>
                          {probation
                            ? "Regularization"
                            : r.scope === "self"
                              ? "Your leave"
                              : "Team"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
