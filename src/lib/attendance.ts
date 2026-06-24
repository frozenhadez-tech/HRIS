import { hoursBetween } from "./utils";

// Server-side attendance computation. Everything is derived in the server's
// timezone and emitted as preformatted strings so the client renders identical
// values (no SSR/client timezone drift).

export type DayStatus =
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "LEAVE"
  | "WEEKEND"
  | "FUTURE";

export interface DayRecord {
  date: string; // YYYY-MM-DD (for inputs)
  dateLabel: string; // e.g. "Mon, Jun 8"
  status: DayStatus;
  timeInLabel: string; // "9:02 AM" or "—"
  timeOutLabel: string;
  timeInValue: string; // "09:02" or "" (for <input type=time>)
  timeOutValue: string;
  hours: number;
  leaveType: string | null;
  lateMinutes: number;
}

export interface MonthlySummary {
  present: number; // days with attendance (includes late)
  late: number;
  absent: number;
  leave: number;
  totalHours: number;
  days: DayRecord[];
}

export interface EntryLite {
  clockIn: Date;
  clockOut: Date | null;
}
export interface LeaveLite {
  startDate: Date;
  endDate: Date;
  leaveTypeName: string;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function label12(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function computeMonthlyAttendance(opts: {
  year: number;
  month: number; // 0-11
  entries: EntryLite[];
  leaves: LeaveLite[];
  now: Date;
  defaultStart: string; // "09:00"
  graceMinutes: number;
}): MonthlySummary {
  const { year, month, entries, leaves, now, defaultStart, graceMinutes } =
    opts;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(now);
  const startThreshold = parseHHMM(defaultStart);

  const entriesByDay = new Map<string, EntryLite[]>();
  for (const e of entries) {
    const k = dateKey(e.clockIn);
    const arr = entriesByDay.get(k);
    if (arr) arr.push(e);
    else entriesByDay.set(k, [e]);
  }

  const leaveByDay = new Map<string, string>();
  for (const lv of leaves) {
    const cur = new Date(lv.startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(lv.endDate);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        leaveByDay.set(dateKey(cur), lv.leaveTypeName);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const days: DayRecord[] = [];
  let present = 0;
  let late = 0;
  let absent = 0;
  let leave = 0;
  let totalHours = 0;

  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, month, d);
    const key = dateKey(date);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const isFuture = key > todayKey;
    const dayEntries = entriesByDay.get(key) ?? [];

    let status: DayStatus = "ABSENT";
    let timeIn: Date | null = null;
    let timeOut: Date | null = null;
    let hours = 0;
    let leaveType: string | null = null;
    let lateMinutes = 0;

    if (dayEntries.length > 0) {
      timeIn = dayEntries.reduce(
        (a, e) => (e.clockIn < a ? e.clockIn : a),
        dayEntries[0].clockIn,
      );
      const closed = dayEntries.filter((e) => e.clockOut) as {
        clockOut: Date;
        clockIn: Date;
      }[];
      timeOut = closed.length
        ? closed.reduce(
            (a, e) => (e.clockOut > a ? e.clockOut : a),
            closed[0].clockOut,
          )
        : null;
      for (const e of dayEntries) {
        const out = e.clockOut ?? (key === todayKey ? now : null);
        if (out) hours += hoursBetween(e.clockIn, out);
      }
      const inMin = minutesOfDay(timeIn);
      if (inMin > startThreshold + graceMinutes) {
        status = "LATE";
        lateMinutes = inMin - startThreshold;
        late += 1;
      } else {
        status = "PRESENT";
      }
      present += 1;
      totalHours += hours;
    } else if (leaveByDay.has(key)) {
      status = "LEAVE";
      leaveType = leaveByDay.get(key) ?? null;
      leave += 1;
    } else if (isWeekend) {
      status = "WEEKEND";
    } else if (isFuture) {
      status = "FUTURE";
    } else {
      status = "ABSENT";
      absent += 1;
    }

    days.push({
      date: key,
      dateLabel: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      status,
      timeInLabel: timeIn ? label12(timeIn) : "—",
      timeOutLabel: timeOut ? label12(timeOut) : "—",
      timeInValue: timeIn ? hhmm(timeIn) : "",
      timeOutValue: timeOut ? hhmm(timeOut) : "",
      hours: Math.round(hours * 100) / 100,
      leaveType,
      lateMinutes,
    });
  }

  return {
    present,
    late,
    absent,
    leave,
    totalHours: Math.round(totalHours * 100) / 100,
    days,
  };
}
