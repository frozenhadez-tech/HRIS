import { Bell } from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { getLeaveReminders } from "@/lib/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function NotificationsPage() {
  await requireUser();
  const reminders = await getLeaveReminders();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Leave reminders and return-to-office dates."
      />

      {reminders.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="You're all caught up"
          description="No reminders right now. Upcoming return-to-office dates will show here."
        />
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{r.message}</p>
                  <div className="mt-1">
                    <Badge tone={r.scope === "self" ? "indigo" : "slate"}>
                      {r.scope === "self" ? "Your leave" : "Team"}
                    </Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
