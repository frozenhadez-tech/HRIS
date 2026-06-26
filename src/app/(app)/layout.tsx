import type { ReactNode } from "react";
import { requireUser } from "@/lib/tenant";
import { fullName } from "@/lib/utils";
import { getReminderCount } from "@/lib/notifications";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // The auth lookup and the badge count both reuse the per-request cached
  // getCurrentUser, so this is one user query + two cheap COUNTs on each nav.
  const [user, notificationCount] = await Promise.all([
    requireUser(),
    getReminderCount(),
  ]);
  const name = user.employee ? fullName(user.employee) : user.email;

  return (
    <AppShell
      user={{ name, email: user.email, role: user.role }}
      orgName={user.organization.name}
      notificationCount={notificationCount}
    >
      {children}
    </AppShell>
  );
}
