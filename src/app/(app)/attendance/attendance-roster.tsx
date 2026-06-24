"use client";

import { useState } from "react";
import type { MonthlySummary, DayStatus } from "@/lib/attendance";
import { editDayAttendance } from "@/lib/actions/attendance";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatHours } from "@/lib/utils";

export interface Roster {
  id: string;
  name: string;
  jobTitle: string | null;
  summary: MonthlySummary;
}

const STATUS: Record<DayStatus, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
  PRESENT: { label: "Present", tone: "green" },
  LATE: { label: "Late", tone: "amber" },
  ABSENT: { label: "Absent", tone: "red" },
  LEAVE: { label: "On leave", tone: "blue" },
  WEEKEND: { label: "Weekend", tone: "slate" },
  FUTURE: { label: "Upcoming", tone: "slate" },
};

const timeInput =
  "h-8 w-full rounded-md border border-slate-300 px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function EmployeeDetail({ roster, canEdit }: { roster: Roster; canEdit: boolean }) {
  const s = roster.summary;
  const days = s.days.filter((d) => d.status !== "WEEKEND");
  const cols = canEdit
    ? "grid grid-cols-[minmax(6rem,1fr)_5.5rem_6.5rem_6.5rem_3.5rem_3.5rem] items-center gap-2"
    : "grid grid-cols-[minmax(6rem,1fr)_5.5rem_6.5rem_6.5rem_3.5rem] items-center gap-2";

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Present" value={s.present} />
        <Stat label="Late" value={s.late} />
        <Stat label="Absent" value={s.absent} />
        <Stat label="On leave" value={s.leave} />
        <Stat label="Total hours" value={formatHours(s.totalHours)} />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className={`${cols} border-b border-slate-200 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400`}>
            <span>Date</span>
            <span>Status</span>
            <span>In</span>
            <span>Out</span>
            <span>Hours</span>
            {canEdit && <span className="text-right">Save</span>}
          </div>

          {days.map((d) => {
            const editable = canEdit && d.status !== "FUTURE";
            if (editable) {
              return (
                <form
                  key={d.date}
                  action={editDayAttendance}
                  className={`${cols} border-b border-slate-50 px-1 py-1.5`}
                >
                  <input type="hidden" name="employeeId" value={roster.id} />
                  <input type="hidden" name="date" value={d.date} />
                  <span className="text-sm text-slate-700">{d.dateLabel}</span>
                  <span>
                    <Badge tone={STATUS[d.status].tone}>
                      {d.leaveType ?? STATUS[d.status].label}
                    </Badge>
                  </span>
                  <input type="time" name="clockIn" defaultValue={d.timeInValue} className={timeInput} />
                  <input type="time" name="clockOut" defaultValue={d.timeOutValue} className={timeInput} />
                  <span className="text-sm text-slate-500">
                    {d.hours ? `${d.hours}h` : "—"}
                  </span>
                  <button type="submit" className={buttonVariants("secondary", "sm")}>
                    Save
                  </button>
                </form>
              );
            }
            return (
              <div
                key={d.date}
                className={`${cols} border-b border-slate-50 px-1 py-2`}
              >
                <span className="text-sm text-slate-700">{d.dateLabel}</span>
                <span>
                  <Badge tone={STATUS[d.status].tone}>
                    {d.leaveType ?? STATUS[d.status].label}
                  </Badge>
                </span>
                <span className="text-sm text-slate-500">{d.timeInLabel}</span>
                <span className="text-sm text-slate-500">{d.timeOutLabel}</span>
                <span className="text-sm text-slate-500">
                  {d.hours ? `${d.hours}h` : "—"}
                </span>
                {canEdit && <span />}
              </div>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <p className="mt-3 text-xs text-slate-400">
          Set a time in/out and Save to record a day. Clear both and Save to mark
          the day absent.
        </p>
      )}
    </div>
  );
}

export function AttendanceRoster({
  rosters,
  monthLabel,
  canEdit,
}: {
  rosters: Roster[];
  monthLabel: string;
  canEdit: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rosters.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Employee</TH>
            <TH>Present</TH>
            <TH>Late</TH>
            <TH>Absent</TH>
            <TH>On leave</TH>
            <TH className="hidden sm:table-cell">Hours</TH>
          </TR>
        </THead>
        <TBody>
          {rosters.map((r) => (
            <TR key={r.id}>
              <TD>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar
                    first={r.name.split(" ")[0]}
                    last={r.name.split(" ")[1]}
                    size="sm"
                  />
                  <span>
                    <span className="font-medium text-indigo-600 hover:underline">
                      {r.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {r.jobTitle ?? "—"}
                    </span>
                  </span>
                </button>
              </TD>
              <TD>{r.summary.present}</TD>
              <TD>
                {r.summary.late > 0 ? (
                  <Badge tone="amber">{r.summary.late}</Badge>
                ) : (
                  0
                )}
              </TD>
              <TD>
                {r.summary.absent > 0 ? (
                  <Badge tone="red">{r.summary.absent}</Badge>
                ) : (
                  0
                )}
              </TD>
              <TD>{r.summary.leave}</TD>
              <TD className="hidden sm:table-cell">
                {formatHours(r.summary.totalHours)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `${selected.name} · ${monthLabel}` : ""}
        wide
      >
        {selected && <EmployeeDetail roster={selected} canEdit={canEdit} />}
      </Modal>
    </>
  );
}
