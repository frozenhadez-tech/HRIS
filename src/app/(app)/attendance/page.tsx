import Link from "next/link";
import { Clock, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { roleAtLeast, can } from "@/lib/auth/rbac";
import { clockIn, clockOut } from "@/lib/actions/attendance";
import { computeMonthlyAttendance } from "@/lib/attendance";
import { WORK_START_DEFAULT, LATE_GRACE_MINUTES } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fullName, formatTime, formatHours, hoursBetween } from "@/lib/utils";
import { AttendanceRoster, type Roster } from "./attendance-roster";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await requireUser();
  const orgId = me.organizationId;
  const { month } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      monthIdx = m - 1;
    }
  }
  const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const fmtParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prevParam = fmtParam(new Date(year, monthIdx - 1, 1));
  const nextParam = fmtParam(new Date(year, monthIdx + 1, 1));

  // Self clock-in/out widget (only when linked to an employee profile).
  const myEmpId = me.employeeId;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const self = myEmpId
    ? await (async () => {
        const [open, todayMine] = await Promise.all([
          prisma.timeEntry.findFirst({
            where: { organizationId: orgId, employeeId: myEmpId, clockOut: null },
            orderBy: { clockIn: "desc" },
          }),
          prisma.timeEntry.findMany({
            where: {
              organizationId: orgId,
              employeeId: myEmpId,
              clockIn: { gte: startOfToday },
            },
          }),
        ]);
        const todayHours = todayMine.reduce(
          (s, e) => s + hoursBetween(e.clockIn, e.clockOut ?? now),
          0,
        );
        return { open, todayHours };
      })()
    : null;

  // Roster: managers see their team, HR/Admin see everyone.
  const isHR = roleAtLeast(me.role, "HR_MANAGER");
  const canTeam = can.viewTeamAttendance(me.role);
  const canEdit = can.editAttendance(me.role);
  let rosters: Roster[] = [];
  if (canTeam) {
    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        ...(isHR ? {} : { managerId: myEmpId ?? "__none__" }),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, jobTitle: true },
    });
    const ids = employees.map((e) => e.id);
    if (ids.length) {
      const [entries, leaves] = await Promise.all([
        prisma.timeEntry.findMany({
          where: {
            organizationId: orgId,
            employeeId: { in: ids },
            clockIn: { gte: monthStart, lte: monthEnd },
          },
          select: { employeeId: true, clockIn: true, clockOut: true },
        }),
        prisma.leaveRequest.findMany({
          where: {
            organizationId: orgId,
            employeeId: { in: ids },
            status: "APPROVED",
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
          },
          select: {
            employeeId: true,
            startDate: true,
            endDate: true,
            leaveType: { select: { name: true } },
          },
        }),
      ]);

      const entriesBy = new Map<
        string,
        { clockIn: Date; clockOut: Date | null }[]
      >();
      for (const e of entries) {
        const a = entriesBy.get(e.employeeId) ?? [];
        a.push({ clockIn: e.clockIn, clockOut: e.clockOut });
        entriesBy.set(e.employeeId, a);
      }
      const leavesBy = new Map<
        string,
        { startDate: Date; endDate: Date; leaveTypeName: string }[]
      >();
      for (const l of leaves) {
        const a = leavesBy.get(l.employeeId) ?? [];
        a.push({
          startDate: l.startDate,
          endDate: l.endDate,
          leaveTypeName: l.leaveType.name,
        });
        leavesBy.set(l.employeeId, a);
      }

      rosters = employees.map((emp) => ({
        id: emp.id,
        name: fullName(emp),
        jobTitle: emp.jobTitle,
        summary: computeMonthlyAttendance({
          year,
          month: monthIdx,
          entries: entriesBy.get(emp.id) ?? [],
          leaves: leavesBy.get(emp.id) ?? [],
          now,
          defaultStart: WORK_START_DEFAULT,
          graceMinutes: LATE_GRACE_MINUTES,
        }),
      }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Clock in and out, and review attendance."
      />

      {self && (
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`grid h-12 w-12 place-items-center rounded-full ${
                  self.open
                    ? "bg-green-100 text-green-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Clock className="h-6 w-6" />
              </div>
              <div>
                {self.open ? (
                  <>
                    <p className="font-semibold text-slate-900">
                      Clocked in since {formatTime(self.open.clockIn)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatHours(hoursBetween(self.open.clockIn, now))} elapsed
                      · {formatHours(self.todayHours)} today
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-900">
                      You&apos;re clocked out
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatHours(self.todayHours)} logged today
                    </p>
                  </>
                )}
              </div>
            </div>
            {self.open ? (
              <form action={clockOut}>
                <button className={buttonVariants("danger")}>Clock out</button>
              </form>
            ) : (
              <form action={clockIn}>
                <button className={buttonVariants("primary")}>Clock in</button>
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {canTeam && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Team attendance</h2>
              <p className="text-sm text-slate-500">
                {isHR
                  ? "Everyone in your organization."
                  : "Your direct reports."}{" "}
                Click a name for the full breakdown.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/attendance?month=${prevParam}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="min-w-36 text-center text-sm font-medium text-slate-700">
                {monthLabel}
              </span>
              <Link
                href={`/attendance?month=${nextParam}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {rosters.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No employees to show"
              description="There are no employees in your scope yet."
            />
          ) : (
            <AttendanceRoster
              rosters={rosters}
              monthLabel={monthLabel}
              canEdit={canEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}
