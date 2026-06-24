"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { shiftSchema, shiftAssignmentSchema } from "@/lib/validations";
import type { ActionState } from "./state";
import {
  zodToState,
  messageFor,
  assertEmployeeInOrg,
  assertShiftInOrg,
} from "./_server";

export async function createShift(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = shiftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    const created = await prisma.shift.create({
      data: { organizationId: user.organizationId, ...parsed.data },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "shift.create",
      entityType: "Shift",
      entityId: created.id,
      metadata: { name: created.name },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/scheduling");
  redirect("/scheduling");
}

export async function deleteShift(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.shift.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "shift.delete",
    entityType: "Shift",
    entityId: id,
  });
  revalidatePath("/scheduling");
  redirect("/scheduling");
}

export async function assignShift(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = shiftAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { employeeId, shiftId, date, note } = parsed.data;
  try {
    const user = await authorize("HR_MANAGER");
    await assertEmployeeInOrg(user.organizationId, employeeId);
    await assertShiftInOrg(user.organizationId, shiftId);

    // Normalize to a date-only (UTC midnight) value to match the @db.Date column.
    const day = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    await prisma.shiftAssignment.upsert({
      where: { employeeId_date: { employeeId, date: day } },
      create: {
        organizationId: user.organizationId,
        employeeId,
        shiftId,
        date: day,
        note,
      },
      update: { shiftId, note },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "shift.assign",
      entityType: "ShiftAssignment",
      entityId: employeeId,
      metadata: { shiftId, date: day.toISOString().slice(0, 10) },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/scheduling");
  redirect("/scheduling");
}

export async function unassignShift(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.shiftAssignment.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "shift.unassign",
    entityType: "ShiftAssignment",
    entityId: id,
  });
  revalidatePath("/scheduling");
  redirect("/scheduling");
}
