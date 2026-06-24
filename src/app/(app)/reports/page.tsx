import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  EmployeeStatusBadge,
  EmploymentStatusBadge,
} from "@/components/status-badges";
import { PrintButton } from "@/components/print-button";
import { fullName, formatDate, formatCurrency } from "@/lib/utils";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_STATUSES,
} from "@/lib/constants";

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="report-card rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Breakdown({
  title,
  keyLabel,
  rows,
  total,
}: {
  title: string;
  keyLabel: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  return (
    <Card className="report-card">
      <CardHeader title={title} />
      <CardBody className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>{keyLabel}</TH>
              <TH className="text-right">Headcount</TH>
              <TH className="text-right">Share</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.label}>
                <TD className="font-medium text-slate-900">{r.label}</TD>
                <TD className="text-right">{r.count}</TD>
                <TD className="text-right text-slate-500">
                  {total > 0 ? Math.round((r.count / total) * 100) : 0}%
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

export default async function EmployeeReportPage() {
  const user = await requireRole("MANAGER");
  const orgId = user.organizationId;
  const currency = user.organization.currency;
  const showComp = can.viewCompensation(user.role);

  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      department: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  const now = new Date();
  const year = now.getFullYear();
  const total = employees.length;

  // Tally the org from the roster in a single pass.
  const empStatusCounts = Object.fromEntries(
    EMPLOYMENT_STATUSES.map((s) => [s, 0]),
  ) as Record<(typeof EMPLOYMENT_STATUSES)[number], number>;
  const typeCounts = Object.fromEntries(
    EMPLOYMENT_TYPES.map((t) => [t, 0]),
  ) as Record<(typeof EMPLOYMENT_TYPES)[number], number>;
  const statusCounts = Object.fromEntries(
    EMPLOYEE_STATUSES.map((s) => [s, 0]),
  ) as Record<(typeof EMPLOYEE_STATUSES)[number], number>;
  const deptCounts = new Map<string, number>();
  let noDept = 0;
  let newHires = 0;
  let totalSalary = 0;
  let totalAllowance = 0;
  let activeCount = 0;

  for (const e of employees) {
    empStatusCounts[e.employmentStatus]++;
    typeCounts[e.employmentType]++;
    statusCounts[e.status]++;
    if (e.department?.name) {
      deptCounts.set(e.department.name, (deptCounts.get(e.department.name) ?? 0) + 1);
    } else {
      noDept++;
    }
    if (e.hireDate && e.hireDate.getFullYear() === year) newHires++;
    if (e.status === "ACTIVE") {
      totalSalary += e.monthlySalary;
      totalAllowance += e.monthlyAllowance;
      activeCount++;
    }
  }

  const deptRows = [
    ...[...deptCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })),
    ...(noDept > 0 ? [{ label: "No department", count: noDept }] : []),
  ];
  const empStatusRows = EMPLOYMENT_STATUSES.map((s) => ({
    label: EMPLOYMENT_STATUS_LABELS[s],
    count: empStatusCounts[s],
  })).filter((r) => r.count > 0);
  const typeRows = EMPLOYMENT_TYPES.map((t) => ({
    label: EMPLOYMENT_TYPE_LABELS[t],
    count: typeCounts[t],
  })).filter((r) => r.count > 0);
  const statusRows = EMPLOYEE_STATUSES.map((s) => ({
    label: EMPLOYEE_STATUS_LABELS[s],
    count: statusCounts[s],
  })).filter((r) => r.count > 0);

  return (
    <div>
      <div className="print-hidden">
        <PageHeader
          title="Employee report"
          description="A printable workforce snapshot across the organization."
          action={<PrintButton label="Print report" />}
        />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No employees yet"
          description="Add employees to generate a workforce report."
        />
      ) : (
        <div className="report-doc space-y-6">
          <div className="report-card border-b border-slate-200 pb-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {user.organization.name}
            </h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Employee Report
            </p>
            <p className="mt-1 text-xs text-slate-400">
              As of {formatDate(now)} · {total}{" "}
              {total === 1 ? "employee" : "employees"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Total" value={total} />
            <Stat label="Active" value={statusCounts.ACTIVE} />
            <Stat label="On leave" value={statusCounts.ON_LEAVE} />
            <Stat label="Probationary" value={empStatusCounts.PROBATIONARY} />
            <Stat label="Regular" value={empStatusCounts.REGULAR} />
            <Stat label={`New hires ${year}`} value={newHires} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Breakdown
              title="Headcount by department"
              keyLabel="Department"
              rows={deptRows}
              total={total}
            />
            <Breakdown
              title="By employment status"
              keyLabel="Status"
              rows={empStatusRows}
              total={total}
            />
            <Breakdown
              title="By employment type"
              keyLabel="Type"
              rows={typeRows}
              total={total}
            />
            <Breakdown
              title="By work status"
              keyLabel="Status"
              rows={statusRows}
              total={total}
            />
          </div>

          {showComp && (
            <Card className="report-card">
              <CardHeader
                title="Monthly compensation"
                description={`Base pay and allowances for ${activeCount} active ${
                  activeCount === 1 ? "employee" : "employees"
                }.`}
              />
              <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Base salary / month</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(totalSalary, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Allowances / month</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(totalAllowance, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total / month</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(totalSalary + totalAllowance, currency)}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="report-roster">
            <CardHeader title={`Employee roster (${total})`} />
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Emp #</TH>
                    <TH>Name</TH>
                    <TH>Job title</TH>
                    <TH>Department</TH>
                    <TH>Manager</TH>
                    <TH>Type</TH>
                    <TH>Employment</TH>
                    <TH>Status</TH>
                    <TH>Hire date</TH>
                  </TR>
                </THead>
                <TBody>
                  {employees.map((e) => (
                    <TR key={e.id}>
                      <TD className="whitespace-nowrap">{e.employeeNumber}</TD>
                      <TD className="font-medium text-slate-900">
                        {fullName(e)}
                      </TD>
                      <TD>{e.jobTitle ?? "—"}</TD>
                      <TD>{e.department?.name ?? "—"}</TD>
                      <TD>{e.manager ? fullName(e.manager) : "—"}</TD>
                      <TD className="whitespace-nowrap">
                        {EMPLOYMENT_TYPE_LABELS[e.employmentType]}
                      </TD>
                      <TD>
                        <EmploymentStatusBadge status={e.employmentStatus} />
                      </TD>
                      <TD>
                        <EmployeeStatusBadge status={e.status} />
                      </TD>
                      <TD className="whitespace-nowrap">
                        {e.hireDate ? formatDate(e.hireDate) : "—"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
