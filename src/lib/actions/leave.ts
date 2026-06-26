"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize, authorizeEmployee } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { roleAtLeast } from "@/lib/auth/rbac";
import {
  leaveRequestSchema,
  leaveTypeSchema,
  leaveBalanceSchema,
  holidaySchema,
} from "@/lib/validations";
import { countLeaveDays, leaveDateKey } from "@/lib/leave";
import type { ActionState } from "./state";
import {
  zodToState,
  messageFor,
  assertEmployeeInOrg,
  getLeaveTypeInOrg,
} from "./_server";

/** Holiday date keys for an org (excluded from leave day counts). */
async function holidayKeys(organizationId: string): Promise<Set<string>> {
  const holidays = await prisma.holiday.findMany({
    where: { organizationId },
    select: { date: true },
  });
  return new Set(holidays.map((h) => leaveDateKey(h.date)));
}

// ---------------------------------------------------------------------------
// Employee self-service
// ---------------------------------------------------------------------------

export async function createLeaveRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { leaveTypeId, startDate, endDate, halfDay, reason } = parsed.data;

  try {
    const me = await authorizeEmployee();
    const leaveType = await getLeaveTypeInOrg(me.organizationId, leaveTypeId);
    if (!leaveType.isActive) return { error: "That leave type is not active." };

    const keys = await holidayKeys(me.organizationId);
    const days = countLeaveDays(startDate, endDate, keys, halfDay);
    if (days <= 0) {
      return {
        error: "The selected range has no working days (weekend/holiday only).",
      };
    }

    // Enforce balance only for paid leave types.
    if (leaveType.paid) {
      const year = startDate.getFullYear();
      // These two reads are independent — run them in one round trip.
      const [balance, pendingAgg] = await Promise.all([
        prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: me.employeeId,
              leaveTypeId,
              year,
            },
          },
        }),
        prisma.leaveRequest.aggregate({
          where: {
            employeeId: me.employeeId,
            leaveTypeId,
            status: "PENDING",
            startDate: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31, 23, 59, 59),
            },
          },
          _sum: { days: true },
        }),
      ]);
      const allocated = balance?.allocatedDays ?? leaveType.defaultAllocationDays;
      const used = balance?.usedDays ?? 0;
      const available = allocated - used - (pendingAgg._sum.days ?? 0);
      if (days > available) {
        return {
          error: `Not enough balance: ${days} day(s) requested, ${available} available.`,
        };
      }
    }

    const created = await prisma.leaveRequest.create({
      data: {
        organizationId: me.organizationId,
        employeeId: me.employeeId,
        leaveTypeId,
        startDate,
        endDate,
        days,
        halfDay,
        reason,
        status: "PENDING",
      },
    });
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "leave.request.create",
      entityType: "LeaveRequest",
      entityId: created.id,
      metadata: { days, leaveType: leaveType.name },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/leave");
  revalidatePath("/approvals");
  redirect("/leave");
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  const me = await authorizeEmployee();
  const result = await prisma.leaveRequest.updateMany({
    where: {
      id,
      organizationId: me.organizationId,
      employeeId: me.employeeId,
      status: "PENDING",
    },
    data: { status: "CANCELLED" },
  });
  if (result.count > 0) {
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "leave.request.cancel",
      entityType: "LeaveRequest",
      entityId: id,
    });
  }
  revalidatePath("/leave");
  redirect("/leave");
}

export async function updateLeaveRequest(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { leaveTypeId, startDate, endDate, halfDay, reason } = parsed.data;

  try {
    const me = await authorizeEmployee();
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, organizationId: me.organizationId, employeeId: me.employeeId },
      select: { status: true },
    });
    if (!existing) return { error: "Request not found." };
    if (existing.status !== "PENDING") {
      return { error: "Only pending requests can be edited." };
    }

    const leaveType = await getLeaveTypeInOrg(me.organizationId, leaveTypeId);
    if (!leaveType.isActive) return { error: "That leave type is not active." };

    const keys = await holidayKeys(me.organizationId);
    const days = countLeaveDays(startDate, endDate, keys, halfDay);
    if (days <= 0) {
      return {
        error: "The selected range has no working days (weekend/holiday only).",
      };
    }

    if (leaveType.paid) {
      const year = startDate.getFullYear();
      const [balance, pendingAgg] = await Promise.all([
        prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: me.employeeId,
              leaveTypeId,
              year,
            },
          },
        }),
        prisma.leaveRequest.aggregate({
          where: {
            employeeId: me.employeeId,
            leaveTypeId,
            status: "PENDING",
            id: { not: id }, // exclude the request being edited
            startDate: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31, 23, 59, 59),
            },
          },
          _sum: { days: true },
        }),
      ]);
      const allocated = balance?.allocatedDays ?? leaveType.defaultAllocationDays;
      const used = balance?.usedDays ?? 0;
      const available = allocated - used - (pendingAgg._sum.days ?? 0);
      if (days > available) {
        return {
          error: `Not enough balance: ${days} day(s) requested, ${available} available.`,
        };
      }
    }

    await prisma.leaveRequest.updateMany({
      where: { id, organizationId: me.organizationId, employeeId: me.employeeId, status: "PENDING" },
      data: { leaveTypeId, startDate, endDate, days, halfDay, reason },
    });
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "leave.request.update",
      entityType: "LeaveRequest",
      entityId: id,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/leave");
  redirect("/leave");
}

// ---------------------------------------------------------------------------
// HR: company holidays
// ---------------------------------------------------------------------------

export async function createHoliday(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = holidaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    await prisma.holiday.create({
      data: {
        organizationId: user.organizationId,
        name: parsed.data.name,
        date: parsed.data.date,
      },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "holiday.create",
      entityType: "Holiday",
      metadata: { name: parsed.data.name },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/leave/holidays");
  redirect("/leave/holidays");
}

export async function deleteHoliday(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.holiday.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "holiday.delete",
    entityType: "Holiday",
    entityId: id,
  });
  revalidatePath("/leave/holidays");
  redirect("/leave/holidays");
}

// ---------------------------------------------------------------------------
// Manager / HR review
// ---------------------------------------------------------------------------

async function reviewLeaveRequest(
  id: string,
  decision: "APPROVED" | "REJECTED",
  formData: FormData,
): Promise<void> {
  const approver = await authorize("MANAGER");
  const note = ((formData.get("note") as string | null) ?? "").trim() || null;

  const request = await prisma.leaveRequest.findFirst({
    where: { id, organizationId: approver.organizationId },
    include: {
      employee: { select: { id: true, managerId: true } },
      leaveType: true,
    },
  });
  if (!request) throw new Error("Leave request not found.");
  if (request.status !== "PENDING") {
    throw new Error("This request has already been reviewed.");
  }

  // HR/Admin can review anyone; managers only their direct reports; nobody their own.
  const isHR = roleAtLeast(approver.role, "HR_MANAGER");
  const isTheirManager =
    approver.employeeId != null &&
    request.employee.managerId === approver.employeeId;
  if (request.employeeId === approver.employeeId) {
    throw new Error("You can't review your own leave request.");
  }
  if (!isHR && !isTheirManager) {
    throw new Error("You can only review requests from your direct reports.");
  }

  if (decision === "APPROVED" && request.leaveType.paid) {
    const year = request.startDate.getFullYear();
    await prisma.$transaction(async (tx) => {
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        create: {
          organizationId: approver.organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
          allocatedDays: request.leaveType.defaultAllocationDays,
          usedDays: request.days,
        },
        update: { usedDays: { increment: request.days } },
      });
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: approver.id,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });
    });
  } else {
    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedById: approver.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
  }

  await writeAudit({
    organizationId: approver.organizationId,
    userId: approver.id,
    action: decision === "APPROVED" ? "leave.request.approve" : "leave.request.reject",
    entityType: "LeaveRequest",
    entityId: id,
  });
  revalidatePath("/approvals");
  revalidatePath("/leave");
}

export async function approveLeaveRequest(
  id: string,
  formData: FormData,
): Promise<void> {
  await reviewLeaveRequest(id, "APPROVED", formData);
  redirect("/approvals");
}

export async function rejectLeaveRequest(
  id: string,
  formData: FormData,
): Promise<void> {
  await reviewLeaveRequest(id, "REJECTED", formData);
  redirect("/approvals");
}

// ---------------------------------------------------------------------------
// HR: leave types & balances
// ---------------------------------------------------------------------------

export async function createLeaveType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    const created = await prisma.leaveType.create({
      data: { organizationId: user.organizationId, ...parsed.data },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "leaveType.create",
      entityType: "LeaveType",
      entityId: created.id,
      metadata: { name: created.name },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/leave/types");
  redirect("/leave/types");
}

export async function updateLeaveType(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    const result = await prisma.leaveType.updateMany({
      where: { id, organizationId: user.organizationId },
      data: parsed.data,
    });
    if (result.count === 0) return { error: "Leave type not found." };
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "leaveType.update",
      entityType: "LeaveType",
      entityId: id,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/leave/types");
  redirect("/leave/types");
}

/**
 * Bulk-grant a year's paid-leave balances to every (non-terminated) employee.
 * The day count per leave type comes from the form (`days_<leaveTypeId>`),
 * defaulting to the type's default allocation when blank/invalid. Creates
 * missing balances and updates existing ones to the chosen allocation, but
 * preserves each balance's used days. Safe to re-run.
 */
export async function grantAnnualCredits(formData: FormData): Promise<void> {
  const user = await authorize("HR_MANAGER");
  const yearRaw = Number(formData.get("year"));
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
      ? yearRaw
      : new Date().getFullYear();

  const [employees, paidTypes] = await Promise.all([
    prisma.employee.findMany({
      where: {
        organizationId: user.organizationId,
        status: { not: "TERMINATED" },
      },
      select: { id: true },
    }),
    prisma.leaveType.findMany({
      where: { organizationId: user.organizationId, isActive: true, paid: true },
      select: { id: true, defaultAllocationDays: true },
    }),
  ]);
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length > 0) {
    for (const t of paidTypes) {
      const raw = formData.get(`days_${t.id}`);
      const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
      const days = Number.isFinite(n)
        ? Math.min(365, Math.max(0, Math.round(n)))
        : t.defaultAllocationDays;

      // Create missing balances at the chosen allocation, then align existing
      // rows to it — without touching their used days.
      await prisma.$transaction([
        prisma.leaveBalance.createMany({
          data: employeeIds.map((employeeId) => ({
            organizationId: user.organizationId,
            employeeId,
            leaveTypeId: t.id,
            year,
            allocatedDays: days,
            usedDays: 0,
          })),
          skipDuplicates: true,
        }),
        prisma.leaveBalance.updateMany({
          where: {
            organizationId: user.organizationId,
            leaveTypeId: t.id,
            year,
            employeeId: { in: employeeIds },
          },
          data: { allocatedDays: days },
        }),
      ]);
    }
  }

  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "leave.balance.grant",
    entityType: "LeaveBalance",
    metadata: { year, employees: employeeIds.length, types: paidTypes.length },
  });
  revalidatePath("/leave/balances");
  redirect("/leave/balances");
}

export async function setLeaveBalance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveBalanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { employeeId, leaveTypeId, year, allocatedDays } = parsed.data;
  try {
    const user = await authorize("HR_MANAGER");
    await assertEmployeeInOrg(user.organizationId, employeeId);
    await getLeaveTypeInOrg(user.organizationId, leaveTypeId);
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
      create: {
        organizationId: user.organizationId,
        employeeId,
        leaveTypeId,
        year,
        allocatedDays,
        usedDays: 0,
      },
      update: { allocatedDays },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "leave.balance.set",
      entityType: "LeaveBalance",
      entityId: employeeId,
      metadata: { leaveTypeId, year, allocatedDays },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/leave/balances");
  redirect("/leave/balances");
}
