import Link from "next/link";
import { Plus, CalendarDays, SlidersHorizontal, Wallet } from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { cancelLeaveRequest } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { LeaveStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function LeavePage() {
  const me = await requireEmployee();
  const orgId = me.organizationId;
  const employeeId = me.employeeId;
  const year = new Date().getFullYear();
  const isHR = can.manageLeaveTypes(me.role);

  const [types, balances, requests] = await Promise.all([
    prisma.leaveType.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.leaveBalance.findMany({ where: { employeeId, year } }),
    prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const balanceByType = new Map(balances.map((b) => [b.leaveTypeId, b]));
  const pendingByType = new Map<string, number>();
  for (const r of requests) {
    if (r.status === "PENDING" && r.startDate.getFullYear() === year) {
      pendingByType.set(
        r.leaveTypeId,
        (pendingByType.get(r.leaveTypeId) ?? 0) + r.days,
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Leave"
        description={`Your balances and requests for ${year}.`}
        action={
          <div className="flex items-center gap-2">
            {isHR && (
              <>
                <Link
                  href="/leave/types"
                  className={buttonVariants("secondary")}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Types
                </Link>
                <Link
                  href="/leave/balances"
                  className={buttonVariants("secondary")}
                >
                  <Wallet className="h-4 w-4" /> Balances
                </Link>
              </>
            )}
            <Link href="/leave/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Request leave
            </Link>
          </div>
        }
      />

      {types.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="No leave types configured"
          description={
            isHR
              ? "Create leave types so employees can request time off."
              : "Ask your HR team to set up leave types."
          }
          action={
            isHR ? (
              <Link href="/leave/types" className={buttonVariants()}>
                <Plus className="h-4 w-4" /> Add leave type
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => {
            const bal = balanceByType.get(t.id);
            const allocated = bal?.allocatedDays ?? t.defaultAllocationDays;
            const used = bal?.usedDays ?? 0;
            const pending = pendingByType.get(t.id) ?? 0;
            const available = allocated - used - pending;
            return (
              <Card key={t.id} className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{t.name}</h3>
                  {t.paid ? (
                    <Badge tone="indigo">Paid</Badge>
                  ) : (
                    <Badge tone="slate">Unpaid</Badge>
                  )}
                </div>
                {t.paid ? (
                  <>
                    <p className="text-3xl font-semibold text-slate-900">
                      {available}
                      <span className="ml-1 text-sm font-normal text-slate-400">
                        / {allocated} days
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {used} used · {pending} pending
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    No balance limit — requests still need approval.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="My requests" />
        <CardBody className="p-0">
          {requests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              You haven&apos;t requested any leave yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH>Dates</TH>
                  <TH>Days</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {requests.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-slate-900">
                      {r.leaveType.name}
                    </TD>
                    <TD>
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </TD>
                    <TD>{r.days}</TD>
                    <TD>
                      <LeaveStatusBadge status={r.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {r.status === "PENDING" && (
                          <DeleteButton
                            action={cancelLeaveRequest.bind(null, r.id)}
                            size="sm"
                            confirmMessage="Cancel this leave request?"
                          >
                            Cancel
                          </DeleteButton>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
