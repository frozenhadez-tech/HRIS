"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { payrollRunSchema, payslipAdjustSchema } from "@/lib/validations";
import {
  computePayslip,
  computePeriodAttendance,
  PH_PAYROLL,
  type PeriodEntry,
  type PeriodLeave,
} from "@/lib/payroll";
import type { ActionState } from "./state";
import { zodToState, messageFor } from "./_server";

const r2 = (n: number) => Math.round(n * 100) / 100;
const toLocalMidnight = (d: Date) =>
  new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export async function createPayrollRun(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = payrollRunSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { label, frequency, periodStart, periodEnd, payDate } = parsed.data;

  let runId: string;
  try {
    const user = await authorize("HR_MANAGER");
    const orgId = user.organizationId;

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, status: "ACTIVE", monthlySalary: { gt: 0 } },
      select: { id: true, monthlySalary: true, monthlyAllowance: true },
    });
    if (employees.length === 0) {
      return {
        error:
          "No active employees with a monthly salary set. Set salaries on employee records first.",
      };
    }
    const ids = employees.map((e) => e.id);

    // Local-midnight period bounds for attendance grouping (keyed by local date).
    const psLocal = toLocalMidnight(periodStart);
    const peLocal = toLocalMidnight(periodEnd);
    const peEnd = new Date(peLocal);
    peEnd.setHours(23, 59, 59, 999);

    const [entries, leaves] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          organizationId: orgId,
          employeeId: { in: ids },
          clockIn: { gte: psLocal, lte: peEnd },
        },
        select: { employeeId: true, clockIn: true, clockOut: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          organizationId: orgId,
          employeeId: { in: ids },
          status: "APPROVED",
          startDate: { lte: peEnd },
          endDate: { gte: psLocal },
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
          leaveType: { select: { paid: true } },
        },
      }),
    ]);

    const entriesBy = new Map<string, PeriodEntry[]>();
    for (const e of entries) {
      const a = entriesBy.get(e.employeeId) ?? [];
      a.push({ clockIn: e.clockIn, clockOut: e.clockOut });
      entriesBy.set(e.employeeId, a);
    }
    const leavesBy = new Map<string, PeriodLeave[]>();
    for (const l of leaves) {
      const a = leavesBy.get(l.employeeId) ?? [];
      a.push({ startDate: l.startDate, endDate: l.endDate, paid: l.leaveType.paid });
      leavesBy.set(l.employeeId, a);
    }

    const now = new Date();
    const run = await prisma.payrollRun.create({
      data: {
        organizationId: orgId,
        label,
        frequency,
        periodStart,
        periodEnd,
        payDate,
        status: "DRAFT",
        createdById: user.id,
      },
    });
    runId = run.id;

    const data = employees.map((emp) => {
      const att = computePeriodAttendance({
        periodStart: psLocal,
        periodEnd: peLocal,
        entries: entriesBy.get(emp.id) ?? [],
        leaves: leavesBy.get(emp.id) ?? [],
        now,
      });
      const slip = computePayslip({
        monthlySalary: emp.monthlySalary,
        monthlyAllowance: emp.monthlyAllowance,
        frequency,
        workingDaysInPeriod: att.workingDays,
        overtimeHours: att.overtimeHours,
        absentDays: att.absentDays,
        unpaidLeaveDays: att.unpaidLeaveDays,
        daysWorked: att.daysWorked,
      });
      return {
        organizationId: orgId,
        payrollRunId: run.id,
        employeeId: emp.id,
        ...slip,
      };
    });
    await prisma.payslip.createMany({ data });

    await writeAudit({
      organizationId: orgId,
      userId: user.id,
      action: "payroll.run.create",
      entityType: "PayrollRun",
      entityId: run.id,
      metadata: { label, frequency, payslips: data.length },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/payroll");
  redirect(`/payroll/${runId}`);
}

export async function updatePayslip(
  payslipId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = payslipAdjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { allowance, overtimeHours, otherEarnings, otherDeductions, notes } =
    parsed.data;

  let runId: string;
  try {
    const user = await authorize("HR_MANAGER");
    const slip = await prisma.payslip.findFirst({
      where: { id: payslipId, organizationId: user.organizationId },
      include: {
        payrollRun: { select: { id: true, status: true } },
        employee: { select: { monthlySalary: true } },
      },
    });
    if (!slip) return { error: "Payslip not found." };
    if (slip.payrollRun.status !== "DRAFT") {
      return { error: "This payroll run is finalized and can't be edited." };
    }
    runId = slip.payrollRun.id;

    const hourlyRate =
      slip.employee.monthlySalary /
      (PH_PAYROLL.standardWorkdaysPerMonth * PH_PAYROLL.hoursPerDay);
    const overtimePay = r2(
      overtimeHours * hourlyRate * PH_PAYROLL.overtimeMultiplier,
    );
    const grossPay = r2(slip.basicPay + allowance + overtimePay + otherEarnings);
    const totalDeductions = r2(
      slip.sss +
        slip.philHealth +
        slip.pagIbig +
        slip.withholdingTax +
        slip.absenceDeduction +
        otherDeductions,
    );
    const netPay = r2(grossPay - totalDeductions);

    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        allowance,
        overtimeHours,
        overtimePay,
        otherEarnings,
        otherDeductions,
        notes,
        grossPay,
        totalDeductions,
        netPay,
      },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "payroll.payslip.update",
      entityType: "Payslip",
      entityId: payslipId,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath(`/payroll/${runId}`);
  redirect(`/payroll/${runId}/${payslipId}`);
}

export async function finalizePayrollRun(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.payrollRun.updateMany({
    where: { id, organizationId: user.organizationId, status: "DRAFT" },
    data: { status: "FINALIZED" },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "payroll.run.finalize",
    entityType: "PayrollRun",
    entityId: id,
  });
  revalidatePath(`/payroll/${id}`);
  redirect(`/payroll/${id}`);
}

export async function markPayrollPaid(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.payrollRun.updateMany({
    where: { id, organizationId: user.organizationId, status: "FINALIZED" },
    data: { status: "PAID" },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "payroll.run.paid",
    entityType: "PayrollRun",
    entityId: id,
  });
  revalidatePath(`/payroll/${id}`);
  redirect(`/payroll/${id}`);
}

export async function deletePayrollRun(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  // Only drafts can be deleted.
  await prisma.payrollRun.deleteMany({
    where: { id, organizationId: user.organizationId, status: "DRAFT" },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "payroll.run.delete",
    entityType: "PayrollRun",
    entityId: id,
  });
  revalidatePath("/payroll");
  redirect("/payroll");
}
