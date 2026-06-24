import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleAtLeast } from "@/lib/auth/rbac";
import { nextWorkingDay, leaveDateKey } from "@/lib/leave";
import { fullName, formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export interface Reminder {
  id: string;
  kind: "leave" | "probation";
  scope: "self" | "team";
  href: string;
  message: string;
}

const LEAVE_WINDOW_DAYS = 3; // leaves ending within N days
const PROBATION_WINDOW_DAYS = 30; // probation ending within N days

/**
 * Derived reminders (no table): leaves ending soon (with return-to-office date)
 * and probationary employees due for regularization review. Cached per request
 * so the nav badge and the pages share one set of queries.
 */
export const getReminders = cache(async (): Promise<Reminder[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const orgId = user.organizationId;
  const myEmpId = user.employeeId;
  const isHR = roleAtLeast(user.role, "HR_MANAGER");
  const isMgr = roleAtLeast(user.role, "MANAGER");

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const leaveWindow = new Date(today);
  leaveWindow.setUTCDate(leaveWindow.getUTCDate() + LEAVE_WINDOW_DAYS);
  const probationWindow = new Date(today);
  probationWindow.setUTCDate(probationWindow.getUTCDate() + PROBATION_WINDOW_DAYS);

  // Leave scope (self always; team if manager; all if HR).
  let leaveScope: Prisma.LeaveRequestWhereInput;
  if (isHR) leaveScope = {};
  else if (isMgr)
    leaveScope = {
      OR: [
        { employeeId: myEmpId ?? "__none__" },
        { employee: { managerId: myEmpId ?? "__none__" } },
      ],
    };
  else leaveScope = { employeeId: myEmpId ?? "__none__" };

  const [leaveRequests, holidays, probationers] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        organizationId: orgId,
        status: "APPROVED",
        endDate: { gte: today, lte: leaveWindow },
        ...leaveScope,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.holiday.findMany({ where: { organizationId: orgId }, select: { date: true } }),
    // Probation reminders are an evaluator task — managers (their reports) + HR.
    isMgr
      ? prisma.employee.findMany({
          where: {
            organizationId: orgId,
            status: "ACTIVE",
            employmentStatus: "PROBATIONARY",
            probationEndDate: { lte: probationWindow },
            ...(isHR ? {} : { managerId: myEmpId ?? "__none__" }),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            probationEndDate: true,
          },
          orderBy: { probationEndDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const keys = new Set(holidays.map((h) => leaveDateKey(h.date)));

  const leaveReminders: Reminder[] = leaveRequests.map((r) => {
    const returnDate = nextWorkingDay(r.endDate, keys);
    const isSelf = myEmpId != null && r.employeeId === myEmpId;
    return {
      id: `leave-${r.id}`,
      kind: "leave",
      scope: isSelf ? "self" : "team",
      href: isSelf ? "/leave" : "/leave/calendar",
      message: isSelf
        ? `Your ${r.leaveType.name} ends ${formatDate(
            r.endDate,
          )} — report back to the office on ${formatDate(returnDate)}.`
        : `${fullName(r.employee)}'s ${r.leaveType.name} ends ${formatDate(
            r.endDate,
          )} — returns ${formatDate(returnDate)}.`,
    };
  });

  const probationReminders: Reminder[] = probationers.map((p) => {
    const overdue = p.probationEndDate != null && p.probationEndDate < today;
    return {
      id: `prob-${p.id}`,
      kind: "probation",
      scope: "team",
      href: `/employees/${p.id}`,
      message: overdue
        ? `${fullName(p)}'s probation ended ${formatDate(
            p.probationEndDate,
          )} — overdue for regularization review.`
        : `${fullName(p)}'s probation ends ${formatDate(
            p.probationEndDate,
          )} — evaluate for regularization.`,
    };
  });

  return [...probationReminders, ...leaveReminders];
});
