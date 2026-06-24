"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize, authorizeEmployee } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { dayAttendanceSchema } from "@/lib/validations";
import { assertEmployeeInOrg } from "./_server";

export async function clockIn(): Promise<void> {
  const me = await authorizeEmployee();
  // Only one open entry at a time.
  const open = await prisma.timeEntry.findFirst({
    where: {
      organizationId: me.organizationId,
      employeeId: me.employeeId,
      clockOut: null,
    },
    select: { id: true },
  });
  if (!open) {
    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: me.organizationId,
        employeeId: me.employeeId,
        clockIn: new Date(),
      },
    });
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "attendance.clockIn",
      entityType: "TimeEntry",
      entityId: entry.id,
    });
  }
  revalidatePath("/attendance");
  redirect("/attendance");
}

/**
 * HR/Admin edit of a single day's attendance. Consolidates the day to one
 * time entry (or clears it). Does not redirect, so an open modal stays open.
 */
export async function editDayAttendance(formData: FormData): Promise<void> {
  const parsed = dayAttendanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { employeeId, date, clockIn, clockOut } = parsed.data;

  const user = await authorize("HR_MANAGER");
  await assertEmployeeInOrg(user.organizationId, employeeId);

  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const dayStart = new Date(y, m, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m, d, 23, 59, 59, 999);

  await prisma.timeEntry.deleteMany({
    where: {
      organizationId: user.organizationId,
      employeeId,
      clockIn: { gte: dayStart, lte: dayEnd },
    },
  });

  if (clockIn) {
    const [ih, im] = clockIn.split(":").map(Number);
    const inDate = new Date(y, m, d, ih, im, 0, 0);
    let outDate: Date | null = null;
    if (clockOut) {
      const [oh, om] = clockOut.split(":").map(Number);
      const cand = new Date(y, m, d, oh, om, 0, 0);
      if (cand > inDate) outDate = cand;
    }
    await prisma.timeEntry.create({
      data: {
        organizationId: user.organizationId,
        employeeId,
        clockIn: inDate,
        clockOut: outDate,
      },
    });
  }

  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "attendance.edit",
    entityType: "TimeEntry",
    entityId: employeeId,
    metadata: {
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    },
  });

  revalidatePath("/attendance");
}

export async function clockOut(): Promise<void> {
  const me = await authorizeEmployee();
  const open = await prisma.timeEntry.findFirst({
    where: {
      organizationId: me.organizationId,
      employeeId: me.employeeId,
      clockOut: null,
    },
    orderBy: { clockIn: "desc" },
  });
  if (open) {
    await prisma.timeEntry.update({
      where: { id: open.id },
      data: { clockOut: new Date() },
    });
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "attendance.clockOut",
      entityType: "TimeEntry",
      entityId: open.id,
    });
  }
  revalidatePath("/attendance");
  redirect("/attendance");
}
