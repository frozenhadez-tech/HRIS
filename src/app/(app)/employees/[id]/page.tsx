import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can, ROLE_LABELS } from "@/lib/auth/rbac";
import { deleteEmployee } from "@/lib/actions/employees";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { EmployeeStatusBadge } from "@/components/status-badges";
import { fullName, formatDate, formatCurrency } from "@/lib/utils";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";

function Info({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("MANAGER");

  const emp = await prisma.employee.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      department: true,
      manager: true,
      reports: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      user: true,
    },
  });
  if (!emp) notFound();

  const canManage = can.manageEmployees(user.role);
  const address = [
    emp.addressLine1,
    emp.addressLine2,
    [emp.city, emp.state].filter(Boolean).join(", "),
    [emp.postalCode, emp.country].filter(Boolean).join(" "),
  ]
    .filter((line) => line && line.trim())
    .join("\n");

  return (
    <div>
      <Link
        href="/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar first={emp.firstName} last={emp.lastName} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">
                {fullName(emp)}
              </h1>
              <EmployeeStatusBadge status={emp.status} />
            </div>
            <p className="text-sm text-slate-500">
              {emp.jobTitle ?? "No job title"}
              {emp.department ? ` · ${emp.department.name}` : ""}
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Link
                href={`/employees/${emp.id}/edit`}
                className={buttonVariants("secondary")}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <DeleteButton
                action={deleteEmployee.bind(null, emp.id)}
                confirmMessage={`Delete ${fullName(emp)}? This cannot be undone.`}
              >
                Delete
              </DeleteButton>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Email">{emp.email}</Info>
              <Info label="Phone">{emp.phone}</Info>
              <Info label="Date of birth">
                {emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null}
              </Info>
              <Info label="Gender">{emp.gender}</Info>
              <div className="col-span-2">
                <Info label="Address">
                  {address ? (
                    <span className="whitespace-pre-line">{address}</span>
                  ) : null}
                </Info>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Employment" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Employee number">{emp.employeeNumber}</Info>
              <Info label="Type">
                {EMPLOYMENT_TYPE_LABELS[emp.employmentType]}
              </Info>
              <Info label="Department">{emp.department?.name}</Info>
              <Info label="Reports to">
                {emp.manager ? (
                  <Link
                    href={`/employees/${emp.manager.id}`}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    {fullName(emp.manager)}
                  </Link>
                ) : null}
              </Info>
              <Info label="Hire date">
                {emp.hireDate ? formatDate(emp.hireDate) : null}
              </Info>
              <Info label="Termination date">
                {emp.terminationDate ? formatDate(emp.terminationDate) : null}
              </Info>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Emergency contact" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Name">{emp.emergencyContactName}</Info>
              <Info label="Phone">{emp.emergencyContactPhone}</Info>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Government IDs" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="SSS">{emp.sssNumber}</Info>
              <Info label="PhilHealth">{emp.philHealthNumber}</Info>
              <Info label="TIN">{emp.tin}</Info>
              <Info label="Pag-IBIG">{emp.pagIbigNumber}</Info>
            </dl>
          </CardBody>
        </Card>

        {can.viewCompensation(user.role) && (
          <Card>
            <CardHeader title="Compensation" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Info label="Monthly salary">
                  {formatCurrency(emp.monthlySalary, user.organization.currency)}
                </Info>
                <Info label="Monthly allowance">
                  {formatCurrency(
                    emp.monthlyAllowance,
                    user.organization.currency,
                  )}
                </Info>
              </dl>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Account access" />
          <CardBody>
            {emp.user ? (
              <dl className="grid grid-cols-2 gap-4">
                <Info label="Login email">{emp.user.email}</Info>
                <Info label="Role">
                  <Badge tone="indigo">{ROLE_LABELS[emp.user.role]}</Badge>
                </Info>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">
                No user account is linked to this employee.
              </p>
            )}
          </CardBody>
        </Card>

        {emp.reports.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader title={`Direct reports (${emp.reports.length})`} />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {emp.reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/employees/${r.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <Avatar first={r.firstName} last={r.lastName} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {fullName(r)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.jobTitle ?? "—"}
                        </p>
                      </div>
                      <EmployeeStatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
