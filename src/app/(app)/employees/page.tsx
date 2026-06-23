import Link from "next/link";
import { Plus, Users, Search } from "lucide-react";
import type { Prisma, EmployeeStatus } from "@prisma/client";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmployeeStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/constants";
import { fullName } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireRole("MANAGER");
  const { q, status } = await searchParams;
  const canManage = can.manageEmployees(user.role);

  const where: Prisma.EmployeeWhereInput = {
    organizationId: user.organizationId,
  };
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { employeeNumber: { contains: term, mode: "insensitive" } },
      { jobTitle: { contains: term, mode: "insensitive" } },
    ];
  }
  if (status && EMPLOYEE_STATUSES.includes(status as EmployeeStatus)) {
    where.status = status as EmployeeStatus;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your organization's people."
        action={
          canManage && (
            <Link href="/employees/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Add employee
            </Link>
          )
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, email, number…"
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={status ?? ""} className="w-44">
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EMPLOYEE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No employees found"
          description={
            q || status
              ? "Try adjusting your search or filters."
              : "Get started by adding your first employee."
          }
          action={
            canManage && !q && !status ? (
              <Link href="/employees/new" className={buttonVariants()}>
                <Plus className="h-4 w-4" /> Add employee
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH className="hidden sm:table-cell">Number</TH>
              <TH className="hidden md:table-cell">Job title</TH>
              <TH className="hidden lg:table-cell">Department</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {employees.map((emp) => (
              <TR key={emp.id}>
                <TD>
                  <Link
                    href={`/employees/${emp.id}`}
                    className="flex items-center gap-3"
                  >
                    <Avatar first={emp.firstName} last={emp.lastName} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900 hover:text-indigo-600">
                        {fullName(emp)}
                      </p>
                      <p className="text-xs text-slate-500">{emp.email}</p>
                    </div>
                  </Link>
                </TD>
                <TD className="hidden sm:table-cell">{emp.employeeNumber}</TD>
                <TD className="hidden md:table-cell">{emp.jobTitle ?? "—"}</TD>
                <TD className="hidden lg:table-cell">
                  {emp.department?.name ?? "—"}
                </TD>
                <TD>
                  <EmployeeStatusBadge status={emp.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
