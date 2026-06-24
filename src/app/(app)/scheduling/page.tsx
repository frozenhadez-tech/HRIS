import { CalendarRange, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { deleteShift, unassignShift } from "@/lib/actions/scheduling";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDate } from "@/lib/utils";
import { ShiftForm } from "./shift-form";
import { AssignForm } from "./assign-form";

export default async function SchedulingPage() {
  const me = await requireUser();
  const orgId = me.organizationId;
  const isHR = can.manageShifts(me.role);

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  const myAssignments = me.employeeId
    ? await prisma.shiftAssignment.findMany({
        where: { employeeId: me.employeeId, date: { gte: todayUTC } },
        include: { shift: true },
        orderBy: { date: "asc" },
        take: 30,
      })
    : [];

  const hr = isHR
    ? await (async () => {
        const [shifts, employees, upcoming] = await Promise.all([
          prisma.shift.findMany({
            where: { organizationId: orgId },
            orderBy: { startTime: "asc" },
          }),
          prisma.employee.findMany({
            where: { organizationId: orgId },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: { id: true, firstName: true, lastName: true },
          }),
          prisma.shiftAssignment.findMany({
            where: { organizationId: orgId, date: { gte: todayUTC } },
            include: { employee: true, shift: true },
            orderBy: { date: "asc" },
            take: 60,
          }),
        ]);
        return { shifts, employees, upcoming };
      })()
    : null;

  return (
    <div>
      <PageHeader
        title="Scheduling"
        description={
          isHR
            ? "Manage shifts and assign them to your team."
            : "Your upcoming shifts."
        }
      />

      <Card className="mb-6">
        <CardHeader title="My upcoming shifts" />
        <CardBody className="p-0">
          {myAssignments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No upcoming shifts assigned.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {myAssignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className="h-8 w-1.5 rounded-full"
                    style={{ backgroundColor: a.shift.colorHex ?? "#6366f1" }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {a.shift.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.shift.startTime}–{a.shift.endTime}
                      {a.note ? ` · ${a.note}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-slate-500">
                    {formatDate(a.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {hr && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Shifts" description="Reusable shift templates." />
            <CardBody className="space-y-5">
              <ShiftForm />
              {hr.shifts.length > 0 && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {hr.shifts.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.colorHex ?? "#6366f1" }}
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium text-slate-900">
                          {s.name}
                        </span>{" "}
                        <span className="text-slate-500">
                          {s.startTime}–{s.endTime}
                        </span>
                      </span>
                      <DeleteButton
                        action={deleteShift.bind(null, s.id)}
                        size="sm"
                        confirmMessage={`Delete shift "${s.name}"? Its assignments will be removed.`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </DeleteButton>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assign a shift" />
            <CardBody>
              <AssignForm employees={hr.employees} shifts={hr.shifts} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Upcoming assignments" />
            <CardBody className="p-0">
              {hr.upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarRange className="h-8 w-8" />}
                  title="No upcoming assignments"
                  description="Assign shifts above to populate the schedule."
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Employee</TH>
                      <TH>Shift</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {hr.upcoming.map((a) => (
                      <TR key={a.id}>
                        <TD className="whitespace-nowrap">{formatDate(a.date)}</TD>
                        <TD className="font-medium text-slate-900">
                          {fullName(a.employee)}
                        </TD>
                        <TD>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: a.shift.colorHex ?? "#6366f1",
                              }}
                            />
                            {a.shift.name} ({a.shift.startTime}–{a.shift.endTime})
                          </span>
                        </TD>
                        <TD>
                          <div className="flex justify-end">
                            <DeleteButton
                              action={unassignShift.bind(null, a.id)}
                              size="sm"
                              confirmMessage="Remove this shift assignment?"
                            >
                              Remove
                            </DeleteButton>
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
      )}
    </div>
  );
}
