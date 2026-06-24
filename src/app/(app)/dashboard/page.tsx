import Link from "next/link";
import {
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can, roleAtLeast } from "@/lib/auth/rbac";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { EmployeeStatusBadge } from "@/components/status-badges";
import { PageHeader } from "@/components/ui/page-header";
import { fullName, formatDate } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const orgId = user.organizationId;
  const { error } = await searchParams;

  const [totalEmployees, activeEmployees, departmentCount, userCount, recent] =
    await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId } }),
      prisma.employee.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.department.count({ where: { organizationId: orgId } }),
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.employee.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { department: true },
      }),
    ]);

  const canApprove = roleAtLeast(user.role, "MANAGER");
  const pendingApprovals = canApprove
    ? await prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: "PENDING",
          ...(roleAtLeast(user.role, "HR_MANAGER")
            ? {}
            : { employee: { managerId: user.employeeId ?? "__none__" } }),
        },
      })
    : 0;

  const stats = [
    {
      label: "Total employees",
      value: totalEmployees,
      icon: Users,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Active",
      value: activeEmployees,
      icon: UserCheck,
      tone: "bg-green-50 text-green-600",
    },
    {
      label: "Departments",
      value: departmentCount,
      icon: Building2,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "User accounts",
      value: userCount,
      icon: ShieldCheck,
      tone: "bg-blue-50 text-blue-600",
    },
  ];

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

      {error === "no-employee" && (
        <Alert tone="info" className="mb-6">
          Your account isn&apos;t linked to an employee profile, so self-service
          (leave, attendance, schedule) isn&apos;t available. Ask an admin to link
          your account.
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div
                className={`mb-3 grid h-10 w-10 place-items-center rounded-lg ${s.tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recently added employees"
            action={
              can.manageEmployees(user.role) && (
                <Link
                  href="/employees"
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              )
            }
          />
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No employees yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((emp) => (
                  <li
                    key={emp.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <Avatar first={emp.firstName} last={emp.lastName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {fullName(emp)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {emp.jobTitle ?? "—"}
                        {emp.department ? ` · ${emp.department.name}` : ""}
                      </p>
                    </div>
                    <span className="hidden text-xs text-slate-400 sm:block">
                      Hired {formatDate(emp.hireDate)}
                    </span>
                    <EmployeeStatusBadge status={emp.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
