import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleAtLeast } from "@/lib/auth/rbac";
import { nextWorkingDay, leaveDateKey } from "@/lib/leave";
import { fullName, formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export interface LeaveReminder {
  id: string;
  scope: "self" | "team";
  endDate: string; // ISO
  returnDate: string; // ISO — next working day after the leave ends
  message: string;
}

// How many days ahead to surface "leave ending soon" reminders.
const WINDOW_DAYS = 3;

/**
 * Derived reminders: approved leaves that are ending soon, with the date the
 * employee should report back to the office. Computed live (no table), scoped
 * by role: employees see their own; managers also see direct reports; HR sees
 * everyone. Cached per request so the nav badge and pages share one query.
 */
export const getLeaveReminders = cache(async (): Promise<LeaveReminder[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const orgId = user.organizationId;
  const myEmpId = user.employeeId;

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + WINDOW_DAYS);

  // Scope.
  let scopeFilter: Prisma.LeaveRequestWhereInput;
  if (roleAtLeast(user.role, "HR_MANAGER")) {
    scopeFilter = {};
  } else if (roleAtLeast(user.role, "MANAGER")) {
    scopeFilter = {
      OR: [
        { employeeId: myEmpId ?? "__none__" },
        { employee: { managerId: myEmpId ?? "__none__" } },
      ],
    };
  } else {
    scopeFilter = { employeeId: myEmpId ?? "__none__" };
  }

  const [requests, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        organizationId: orgId,
        status: "APPROVED",
        endDate: { gte: today, lte: windowEnd },
        ...scopeFilter,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.holiday.findMany({ where: { organizationId: orgId }, select: { date: true } }),
  ]);

  const keys = new Set(holidays.map((h) => leaveDateKey(h.date)));

  return requests.map((r) => {
    const returnDate = nextWorkingDay(r.endDate, keys);
    const isSelf = myEmpId != null && r.employeeId === myEmpId;
    const message = isSelf
      ? `Your ${r.leaveType.name} ends ${formatDate(
          r.endDate,
        )} — report back to the office on ${formatDate(returnDate)}.`
      : `${fullName(r.employee)}'s ${r.leaveType.name} ends ${formatDate(
          r.endDate,
        )} — returns ${formatDate(returnDate)}.`;
    return {
      id: r.id,
      scope: isSelf ? ("self" as const) : ("team" as const),
      endDate: r.endDate.toISOString(),
      returnDate: returnDate.toISOString(),
      message,
    };
  });
});
