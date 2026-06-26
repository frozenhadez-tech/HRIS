import Link from "next/link";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can, roleAtLeast } from "@/lib/auth/rbac";
import { getReminders } from "@/lib/notifications";
import { getHrAnalytics } from "@/lib/analytics";
import { getLeaveCredits } from "@/lib/leave-credits";
import {
  KpiCard,
  DonutChart,
  AreaChart,
  BarList,
  ColumnChart,
  SplitBar,
} from "@/components/charts";
import { LeaveCreditCards } from "@/components/leave-credit-cards";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function compactMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; dept?: string }>;
}) {
  const user = await requireUser();
  const orgId = user.organizationId;
  const { error, dept } = await searchParams;
  const isManager = roleAtLeast(user.role, "MANAGER");

  // ---- Personal dashboard (non-managers) --------------------------------
  if (!isManager) {
    const reminders = await getReminders();
    const year = new Date().getFullYear();
    const credits = user.employeeId
      ? await getLeaveCredits(orgId, user.employeeId, year)
      : [];

    return (
      <div>
        <PageHeader
          title={`Welcome, ${user.employee?.firstName ?? user.email}`}
          description={`Here's what's happening at ${user.organization.name}.`}
        />
        {error === "forbidden" && (
          <Alert tone="warning" className="mb-6">
            You don&apos;t have permission to view that page.
          </Alert>
        )}
        {reminders.length > 0 && (
          <Card className="mb-6">
            <CardHeader title="Reminders" />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {reminders.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="block px-5 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {r.message}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
        {credits.length > 0 && (
          <Card>
            <CardHeader title="Your leave credits" description={`Remaining for ${year}.`} />
            <CardBody>
              <LeaveCreditCards credits={credits} />
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  // ---- Workforce analytics (managers / HR / admin) ----------------------
  const showComp = can.viewCompensation(user.role);
  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const deptId = dept && departments.some((d) => d.id === dept) ? dept : null;

  const [a, pendingApprovals] = await Promise.all([
    getHrAnalytics(orgId, deptId),
    roleAtLeast(user.role, "MANAGER")
      ? prisma.leaveRequest.count({
          where: {
            organizationId: orgId,
            status: "PENDING",
            ...(roleAtLeast(user.role, "HR_MANAGER")
              ? {}
              : { employee: { managerId: user.employeeId ?? "__none__" } }),
          },
        })
      : Promise.resolve(0),
  ]);

  const tab = (active: boolean) =>
    cn(
      "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
        : "bg-white/[0.05] text-white/70 hover:bg-white/10",
    );

  return (
    <div>
      <PageHeader
        title="Workforce analytics"
        description={user.organization.name}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/dashboard" className={tab(!deptId)}>
          All departments
        </Link>
        {departments.map((d) => (
          <Link
            key={d.id}
            href={`/dashboard?dept=${d.id}`}
            className={tab(deptId === d.id)}
          >
            {d.name}
          </Link>
        ))}
      </div>

      {error === "forbidden" && (
        <Alert tone="warning" className="mb-6">
          You don&apos;t have permission to view that page.
        </Alert>
      )}
      {pendingApprovals > 0 && (
        <Alert tone="warning" className="mb-6">
          You have {pendingApprovals} leave request
          {pendingApprovals === 1 ? "" : "s"} awaiting your review.{" "}
          <Link href="/approvals" className="font-medium underline">
            Review now
          </Link>
        </Alert>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Headcount" value={a.total} accent="#38bdf8" />
        <KpiCard label="Attrition" value={a.attrition} accent="#f472b6" />
        <KpiCard
          label="Attrition rate"
          value={`${a.attritionRate.toFixed(1)}%`}
          accent="#a78bfa"
        />
        <KpiCard label="Avg age" value={Math.round(a.avgAge) || "—"} accent="#22d3ee" />
        {showComp && (
          <KpiCard
            label="Avg salary"
            value={a.avgSalary ? compactMoney(a.avgSalary, user.organization.currency) : "—"}
            accent="#34d399"
          />
        )}
        <KpiCard
          label="Avg tenure"
          value={a.avgYears ? `${a.avgYears.toFixed(1)} yr` : "—"}
          accent="#2f86ff"
        />
      </div>

      {a.total === 0 ? (
        <Card className="mt-6">
          <CardBody className="py-12 text-center text-sm text-slate-500">
            No employees{deptId ? " in this department" : ""} yet — analytics
            will populate as you add people.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="By employment type" />
            <CardBody>
              <DonutChart data={a.byType} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Headcount by years at company" />
            <CardBody>
              <AreaChart data={a.byTenure} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="By department" />
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Department</TH>
                    <TH className="text-right">Active</TH>
                    <TH className="text-right">Left</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {a.deptTable.map((d) => (
                    <TR key={d.name}>
                      <TD className="font-medium text-slate-900">{d.name}</TD>
                      <TD className="text-right">{d.active}</TD>
                      <TD className="text-right">{d.left}</TD>
                      <TD className="text-right font-medium">{d.total}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="By age" />
            <CardBody>
              <ColumnChart data={a.byAge} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Headcount by department" />
            <CardBody>
              <BarList data={a.byDept} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="By gender" />
            <CardBody>
              <SplitBar data={a.byGender} />
            </CardBody>
          </Card>

          {showComp && a.bySalary.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader title="By salary band" />
              <CardBody>
                <BarList data={a.bySalary} color="#34d399" labelWidth="w-20" />
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
