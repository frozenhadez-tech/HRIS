import { hoursBetween } from "./utils";

// Philippine payroll computation. Statutory rates/brackets live in PH_PAYROLL so
// they can be updated in one place when the government changes them. All amounts
// are computed monthly, then prorated to the pay period inside computePayslip.

export type PayFrequency = "MONTHLY" | "SEMI_MONTHLY" | "DAILY";

export const PH_PAYROLL = {
  standardWorkdaysPerMonth: 22,
  hoursPerDay: 8,
  overtimeMultiplier: 1.25, // ordinary-day OT premium
  sss: { eeRate: 0.045, erRate: 0.095, mscFloor: 4000, mscCeiling: 30000 },
  philHealth: { rate: 0.05, floor: 10000, ceiling: 100000 }, // total, split 50/50
  pagIbig: { eeRate: 0.02, erRate: 0.02, salaryCap: 10000 },
  // BIR monthly withholding-tax brackets (TRAIN, 2023 onwards).
  withholdingMonthly: [
    { over: 0, base: 0, rate: 0 },
    { over: 20833, base: 0, rate: 0.15 },
    { over: 33333, base: 1875, rate: 0.2 },
    { over: 66667, base: 8541.8, rate: 0.25 },
    { over: 166667, base: 33541.8, rate: 0.3 },
    { over: 666667, base: 183541.8, rate: 0.35 },
  ],
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export interface Statutory {
  sssEe: number;
  sssEr: number;
  philHealthEe: number;
  philHealthEr: number;
  pagIbigEe: number;
  pagIbigEr: number;
}

export function computeMonthlyStatutory(monthlySalary: number): Statutory {
  const c = PH_PAYROLL;
  const sssBase = clamp(monthlySalary, c.sss.mscFloor, c.sss.mscCeiling);
  const phBase = clamp(monthlySalary, c.philHealth.floor, c.philHealth.ceiling);
  const pagBase = Math.min(monthlySalary, c.pagIbig.salaryCap);
  return {
    sssEe: round2(sssBase * c.sss.eeRate),
    sssEr: round2(sssBase * c.sss.erRate),
    philHealthEe: round2((phBase * c.philHealth.rate) / 2),
    philHealthEr: round2((phBase * c.philHealth.rate) / 2),
    pagIbigEe: round2(pagBase * c.pagIbig.eeRate),
    pagIbigEr: round2(pagBase * c.pagIbig.erRate),
  };
}

export function computeMonthlyWithholdingTax(monthlyTaxable: number): number {
  if (monthlyTaxable <= 0) return 0;
  let chosen = PH_PAYROLL.withholdingMonthly[0];
  for (const b of PH_PAYROLL.withholdingMonthly) {
    if (monthlyTaxable > b.over) chosen = b;
  }
  return round2(chosen.base + (monthlyTaxable - chosen.over) * chosen.rate);
}

export interface PayslipInput {
  monthlySalary: number;
  monthlyAllowance: number;
  frequency: PayFrequency;
  workingDaysInPeriod: number;
  overtimeHours: number;
  absentDays: number;
  unpaidLeaveDays: number;
  daysWorked: number;
  otherEarnings?: number;
  otherDeductions?: number;
  /** Manual override of overtime pay; when set, overtimeHours is ignored for pay. */
  overtimePayOverride?: number | null;
}

export interface PayslipResult {
  basicPay: number;
  allowance: number;
  overtimeHours: number;
  overtimePay: number;
  otherEarnings: number;
  grossPay: number;
  daysWorked: number;
  absentDays: number;
  unpaidLeaveDays: number;
  sss: number;
  philHealth: number;
  pagIbig: number;
  withholdingTax: number;
  absenceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  sssEr: number;
  philHealthEr: number;
  pagIbigEr: number;
  netPay: number;
}

export function computePayslip(input: PayslipInput): PayslipResult {
  const c = PH_PAYROLL;
  // Daily: pay only days actually worked. Monthly/semi: fixed fraction of salary.
  const isDaily = input.frequency === "DAILY";
  const fraction = isDaily
    ? input.daysWorked / c.standardWorkdaysPerMonth
    : input.frequency === "SEMI_MONTHLY"
      ? 0.5
      : 1;
  const dailyRate = input.monthlySalary / c.standardWorkdaysPerMonth;
  const hourlyRate = dailyRate / c.hoursPerDay;

  const basicPay = round2(input.monthlySalary * fraction);
  const allowance = round2(input.monthlyAllowance * fraction);
  const overtimePay =
    input.overtimePayOverride != null
      ? round2(input.overtimePayOverride)
      : round2(input.overtimeHours * hourlyRate * c.overtimeMultiplier);
  const otherEarnings = round2(input.otherEarnings ?? 0);
  const grossPay = round2(basicPay + allowance + overtimePay + otherEarnings);

  const stat = computeMonthlyStatutory(input.monthlySalary);
  const sss = round2(stat.sssEe * fraction);
  const philHealth = round2(stat.philHealthEe * fraction);
  const pagIbig = round2(stat.pagIbigEe * fraction);
  const sssEr = round2(stat.sssEr * fraction);
  const philHealthEr = round2(stat.philHealthEr * fraction);
  const pagIbigEr = round2(stat.pagIbigEr * fraction);

  // Withholding on basic salary net of statutory (allowance treated as de
  // minimis / non-taxable; OT reconciled at year-end). Monthly tax prorated.
  const monthlyTaxable = Math.max(
    0,
    input.monthlySalary - (stat.sssEe + stat.philHealthEe + stat.pagIbigEe),
  );
  const withholdingTax = round2(
    computeMonthlyWithholdingTax(monthlyTaxable) * fraction,
  );

  // Monthly/semi: deduct only leave-without-pay (don't infer absence from
  // missing clock-ins). Daily: unworked days are simply not paid.
  const absenceDeduction = isDaily
    ? 0
    : round2(dailyRate * input.unpaidLeaveDays);
  const otherDeductions = round2(input.otherDeductions ?? 0);
  const totalDeductions = round2(
    sss + philHealth + pagIbig + withholdingTax + absenceDeduction + otherDeductions,
  );
  const netPay = round2(grossPay - totalDeductions);

  return {
    basicPay,
    allowance,
    overtimeHours: round2(input.overtimeHours),
    overtimePay,
    otherEarnings,
    grossPay,
    daysWorked: input.daysWorked,
    absentDays: input.absentDays,
    unpaidLeaveDays: input.unpaidLeaveDays,
    sss,
    philHealth,
    pagIbig,
    withholdingTax,
    absenceDeduction,
    otherDeductions,
    totalDeductions,
    sssEr,
    philHealthEr,
    pagIbigEr,
    netPay,
  };
}

// --- Attendance integration ---------------------------------------------------

export interface PeriodEntry {
  clockIn: Date;
  clockOut: Date | null;
}
export interface PeriodLeave {
  startDate: Date;
  endDate: Date;
  paid: boolean;
}
export interface PeriodAttendance {
  workingDays: number;
  daysWorked: number;
  absentDays: number;
  unpaidLeaveDays: number;
  paidLeaveDays: number;
  overtimeHours: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Derive worked/absent/leave days and overtime hours for a pay period. */
export function computePeriodAttendance(opts: {
  periodStart: Date;
  periodEnd: Date;
  entries: PeriodEntry[];
  leaves: PeriodLeave[];
  now: Date;
}): PeriodAttendance {
  const { periodStart, periodEnd, entries, leaves, now } = opts;

  const entriesByDay = new Map<string, PeriodEntry[]>();
  for (const e of entries) {
    const k = dayKey(e.clockIn);
    const arr = entriesByDay.get(k);
    if (arr) arr.push(e);
    else entriesByDay.set(k, [e]);
  }

  const leaveByDay = new Map<string, boolean>(); // key -> paid
  for (const lv of leaves) {
    const cur = new Date(lv.startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(lv.endDate);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      leaveByDay.set(dayKey(cur), lv.paid);
      cur.setDate(cur.getDate() + 1);
    }
  }

  let workingDays = 0;
  let daysWorked = 0;
  const absentDays = 0; // not inferred from clock-ins; see note below
  let unpaidLeaveDays = 0;
  let paidLeaveDays = 0;
  let overtimeHours = 0;

  const cursor = new Date(periodStart);
  cursor.setHours(0, 0, 0, 0);
  const stop = new Date(periodEnd);
  stop.setHours(0, 0, 0, 0);

  while (cursor <= stop) {
    const weekday = cursor.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    if (!isWeekend) {
      workingDays += 1;
      const key = dayKey(cursor);
      const dayEntries = entriesByDay.get(key);
      if (dayEntries && dayEntries.length > 0) {
        daysWorked += 1;
        let hours = 0;
        for (const e of dayEntries) {
          const out = e.clockOut ?? (key === dayKey(now) ? now : null);
          if (out) hours += hoursBetween(e.clockIn, out);
        }
        if (hours > PH_PAYROLL.hoursPerDay) {
          overtimeHours += hours - PH_PAYROLL.hoursPerDay;
        }
      } else if (leaveByDay.has(key)) {
        if (leaveByDay.get(key)) paidLeaveDays += 1;
        else unpaidLeaveDays += 1;
      }
      // Missing clock-ins are NOT auto-counted as absences (salaried staff may
      // not use the clock); only recorded leave-without-pay reduces pay.
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    workingDays,
    daysWorked,
    absentDays,
    unpaidLeaveDays,
    paidLeaveDays,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  };
}

export const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  MONTHLY: "Monthly",
  SEMI_MONTHLY: "Semi-monthly",
  DAILY: "Daily",
};
