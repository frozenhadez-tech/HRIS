import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { fullName } from "@/lib/utils";

export default async function LeaveReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireRole("HR_MANAGER");
  const orgId = user.organizationId;
  const { year: yearParam } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  if (yearParam && /^\d{4}$/.test(yearParam)) year = Number(yearParam);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      organizationId: orgId,
      status: "APPROVED",
      startDate: { gte: yearStart, lte: yearEnd },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
  });

  const byType = new Map<string, number>();
  const byDept = new Map<string, number>();
  const byEmp = new Map<string, { name: string; days: number }>();
  let totalDays = 0;
  for (const r of requests) {
    totalDays += r.days;
    byType.set(r.leaveType.name, (byType.get(r.leaveType.name) ?? 0) + r.days);
    const dept = r.employee.department?.name ?? "Unassigned";
    byDept.set(dept, (byDept.get(dept) ?? 0) + r.days);
    const prev = byEmp.get(r.employee.id);
    byEmp.set(r.employee.id, {
      name: fullName(r.employee),
      days: (prev?.days ?? 0) + r.days,
    });
  }
  const topEmployees = [...byEmp.values()]
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

  return (
    <div>
      <Link
        href="/leave"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leave
      </Link>

      <PageHeader
        title="Leave reports"
        description="Approved leave taken across the organization."
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/leave/reports?year=${year - 1}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-16 text-center text-sm font-medium text-slate-700">
              {year}
            </span>
            <Link
              href={`/leave/reports?year=${year + 1}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title={`No approved leave in ${year}`}
          description="Approved leave will be summarized here."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-2xl font-semibold text-slate-900">{totalDays}</p>
              <p className="mt-1 text-sm text-slate-500">Total days taken</p>
            </Card>
            <Card className="p-5">
              <p className="text-2xl font-semibold text-slate-900">
                {requests.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">Approved requests</p>
            </Card>
            <Card className="p-5">
              <p className="text-2xl font-semibold text-slate-900">
                {byEmp.size}
              </p>
              <p className="mt-1 text-sm text-slate-500">Employees on leave</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="By leave type" />
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Type</TH>
                      <TH className="text-right">Days</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {[...byType.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, days]) => (
                        <TR key={name}>
                          <TD className="font-medium text-slate-900">{name}</TD>
                          <TD className="text-right">{days}</TD>
                        </TR>
                      ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="By department" />
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Department</TH>
                      <TH className="text-right">Days</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {[...byDept.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, days]) => (
                        <TR key={name}>
                          <TD className="font-medium text-slate-900">{name}</TD>
                          <TD className="text-right">{days}</TD>
                        </TR>
                      ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Top employees by leave taken" />
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Employee</TH>
                      <TH className="text-right">Days</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {topEmployees.map((emp) => (
                      <TR key={emp.name}>
                        <TD className="font-medium text-slate-900">{emp.name}</TD>
                        <TD className="text-right">{emp.days}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
