import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { roleAtLeast } from "@/lib/auth/rbac";
import { leaveDateKey } from "@/lib/leave";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function LeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const orgId = user.organizationId;
  const myEmpId = user.employeeId;
  const { month } = await searchParams;

  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIdx = now.getUTCMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      monthIdx = m - 1;
    }
  }
  const monthStart = new Date(Date.UTC(year, monthIdx, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const monthEnd = new Date(Date.UTC(year, monthIdx, daysInMonth, 23, 59, 59, 999));
  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const prevParam = fmt(new Date(Date.UTC(year, monthIdx - 1, 1)));
  const nextParam = fmt(new Date(Date.UTC(year, monthIdx + 1, 1)));

  const isHR = roleAtLeast(user.role, "HR_MANAGER");
  const isMgr = roleAtLeast(user.role, "MANAGER");
  let scope: Prisma.LeaveRequestWhereInput;
  if (isHR) scope = {};
  else if (isMgr)
    scope = {
      OR: [
        { employeeId: myEmpId ?? "__none__" },
        { employee: { managerId: myEmpId ?? "__none__" } },
      ],
    };
  else scope = { employeeId: myEmpId ?? "__none__" };

  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        ...scope,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true, colorHex: true } },
      },
    }),
    prisma.holiday.findMany({
      where: { organizationId: orgId, date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const holidayByKey = new Map(holidays.map((h) => [leaveDateKey(h.date), h.name]));

  const firstWeekday = monthStart.getUTCDay();
  const cells: ({ day: number; date: Date; key: string } | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(Date.UTC(year, monthIdx, d));
    cells.push({ day: d, date, key: leaveDateKey(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = leaveDateKey(now);

  return (
    <div>
      <Link
        href="/leave"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leave
      </Link>

      <PageHeader
        title="Leave calendar"
        description={
          isHR
            ? "Everyone's approved and pending leave."
            : isMgr
              ? "Your team's leave."
              : "Your leave."
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/leave/calendar?month=${prevParam}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-36 text-center text-sm font-medium text-slate-700">
              {monthLabel}
            </span>
            <Link
              href={`/leave/calendar?month=${nextParam}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-px rounded-t-xl border border-slate-200 bg-slate-200 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-slate-50 py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-b-xl border border-t-0 border-slate-200 bg-slate-200">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="min-h-24 bg-slate-50/50" />;
              const onLeave = leaves.filter(
                (l) => l.startDate <= cell.date && cell.date <= l.endDate,
              );
              const holiday = holidayByKey.get(cell.key);
              const weekday = cell.date.getUTCDay();
              const isWeekend = weekday === 0 || weekday === 6;
              return (
                <div
                  key={i}
                  className={`min-h-24 p-1.5 ${isWeekend ? "bg-slate-50" : "bg-white"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${
                        cell.key === todayKey
                          ? "grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>
                  {holiday && (
                    <p className="mb-1 truncate rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                      {holiday}
                    </p>
                  )}
                  <div className="space-y-1">
                    {onLeave.slice(0, 3).map((l) => (
                      <p
                        key={l.id}
                        className="truncate rounded px-1 py-0.5 text-[11px]"
                        style={{
                          backgroundColor: `${l.leaveType.colorHex ?? "#6366f1"}22`,
                          color: l.leaveType.colorHex ?? "#4338ca",
                          opacity: l.status === "PENDING" ? 0.7 : 1,
                        }}
                        title={`${fullName(l.employee)} — ${l.leaveType.name}${
                          l.status === "PENDING" ? " (pending)" : ""
                        }`}
                      >
                        {isHR || isMgr ? l.employee.firstName : l.leaveType.name}
                        {l.status === "PENDING" ? " ·" : ""}
                      </p>
                    ))}
                    {onLeave.length > 3 && (
                      <p className="px-1 text-[10px] text-slate-400">
                        +{onLeave.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Solid = approved · faded = pending · amber = company holiday.
      </p>
    </div>
  );
}
