import type { ReactNode } from "react";
import { requireUser } from "@/lib/tenant";
import { fullName } from "@/lib/utils";
import { getLeaveReminders } from "@/lib/notifications";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const name = user.employee ? fullName(user.employee) : user.email;
  const reminders = await getLeaveReminders();

  return (
    <AppShell
      user={{ name, email: user.email, role: user.role }}
      orgName={user.organization.name}
      notificationCount={reminders.length}
    >
      {children}
    </AppShell>
  );
}
