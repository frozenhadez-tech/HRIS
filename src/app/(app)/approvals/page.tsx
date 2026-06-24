import { CheckSquare } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { roleAtLeast } from "@/lib/auth/rbac";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LeaveStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDate, formatDateTime } from "@/lib/utils";

export default async function ApprovalsPage() {
  const me = await requireRole("MANAGER");
  const isHR = roleAtLeast(me.role, "HR_MANAGER");

  // HR/Admin see the whole org; managers see only their direct reports.
  const employeeFilter: Prisma.LeaveRequestWhereInput = isHR
    ? {}
    : { employee: { managerId: me.employeeId ?? "__none__" } };

  const [pending, reviewed] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { organizationId: me.organizationId, status: "PENDING", ...employeeFilter },
      include: { employee: true, leaveType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId: me.organizationId,
        status: { in: ["APPROVED", "REJECTED"] },
        ...employeeFilter,
      },
      include: { employee: true, leaveType: true },
      orderBy: { reviewedAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={
          isHR
            ? "Review leave requests across the organization."
            : "Review leave requests from your direct reports."
        }
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-8 w-8" />}
          title="Nothing to review"
          description="There are no pending leave requests right now."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar first={r.employee.firstName} last={r.employee.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {fullName(r.employee)}
                    </p>
                    <p className="text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        {r.leaveType.name}
                      </span>{" "}
                      · {formatDate(r.startDate)} – {formatDate(r.endDate)} ·{" "}
                      {r.days} day{r.days === 1 ? "" : "s"}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-sm text-slate-600">
                        “{r.reason}”
                      </p>
                    )}
                  </div>
                </div>
                <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    name="note"
                    placeholder="Optional note to the employee…"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <button
                      formAction={approveLeaveRequest.bind(null, r.id)}
                      className={buttonVariants("primary")}
                    >
                      Approve
                    </button>
                    <button
                      formAction={rejectLeaveRequest.bind(null, r.id)}
                      className={buttonVariants("danger")}
                    >
                      Reject
                    </button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Recently reviewed" />
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Type</TH>
                  <TH>Dates</TH>
                  <TH>Status</TH>
                  <TH className="hidden sm:table-cell">Reviewed</TH>
                </TR>
              </THead>
              <TBody>
                {reviewed.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-slate-900">
                      {fullName(r.employee)}
                    </TD>
                    <TD>{r.leaveType.name}</TD>
                    <TD>
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </TD>
                    <TD>
                      <LeaveStatusBadge status={r.status} />
                    </TD>
                    <TD className="hidden sm:table-cell text-slate-500">
                      {r.reviewedAt ? formatDateTime(r.reviewedAt) : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
