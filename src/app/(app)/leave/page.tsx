import Link from "next/link";
import {
  Plus,
  CalendarDays,
  SlidersHorizontal,
  Wallet,
  CalendarRange,
  CalendarOff,
  BarChart3,
  Pencil,
} from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { cancelLeaveRequest } from "@/lib/actions/leave";
import { getLeaveCredits } from "@/lib/leave-credits";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LeaveCreditCards } from "@/components/leave-credit-cards";
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

  const [credits, requests] = await Promise.all([
    getLeaveCredits(orgId, employeeId, year),
    prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Leave"
        description={`Your balances and requests for ${year}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/leave/calendar" className={buttonVariants("secondary")}>
              <CalendarRange className="h-4 w-4" /> Calendar
            </Link>
            {isHR && (
              <>
                <Link href="/leave/types" className={buttonVariants("secondary")}>
                  <SlidersHorizontal className="h-4 w-4" /> Types
                </Link>
                <Link href="/leave/balances" className={buttonVariants("secondary")}>
                  <Wallet className="h-4 w-4" /> Balances
                </Link>
                <Link href="/leave/holidays" className={buttonVariants("secondary")}>
                  <CalendarOff className="h-4 w-4" /> Holidays
                </Link>
                <Link href="/leave/reports" className={buttonVariants("secondary")}>
                  <BarChart3 className="h-4 w-4" /> Reports
                </Link>
              </>
            )}
            <Link href="/leave/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Request leave
            </Link>
          </div>
        }
      />

      {credits.length === 0 ? (
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
        <LeaveCreditCards credits={credits} className="mb-6" />
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
                      <div className="flex items-center justify-end gap-2">
                        {r.status === "PENDING" && (
                          <>
                            <Link
                              href={`/leave/${r.id}/edit`}
                              className={buttonVariants("secondary", "sm")}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Link>
                            <DeleteButton
                              action={cancelLeaveRequest.bind(null, r.id)}
                              size="sm"
                              confirmMessage="Cancel this leave request?"
                            >
                              Cancel
                            </DeleteButton>
                          </>
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
