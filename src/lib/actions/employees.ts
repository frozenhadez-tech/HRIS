"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { employeeSchema } from "@/lib/validations";
import { fullName } from "@/lib/utils";
import { PROBATION_MONTHS } from "@/lib/constants";
import type { ActionState } from "./state";
import {
  zodToState,
  messageFor,
  assertDepartmentInOrg,
  assertEmployeeInOrg,
  grantLeaveBalances,
} from "./_server";

/** Default a probationary hire's probation end to hire date + 6 months. */
function withProbationEnd<
  T extends {
    employmentStatus?: string;
    probationEndDate?: Date | null;
    hireDate?: Date | null;
  },
>(data: T): T {
  if (
    data.employmentStatus === "PROBATIONARY" &&
    !data.probationEndDate &&
    data.hireDate
  ) {
    const d = new Date(data.hireDate);
    d.setMonth(d.getMonth() + PROBATION_MONTHS);
    return { ...data, probationEndDate: d };
  }
  return data;
}

export async function createEmployee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const data = parsed.data;

  let createdId: string;
  try {
    const user = await authorize("HR_MANAGER");
    await assertDepartmentInOrg(user.organizationId, data.departmentId);
    await assertEmployeeInOrg(user.organizationId, data.managerId);

    const created = await prisma.employee.create({
      data: { organizationId: user.organizationId, ...withProbationEnd(data) },
    });
    // Seed this year's paid-leave balances from the type defaults so the new
    // hire starts with visible credits (idempotent / non-destructive).
    await grantLeaveBalances(user.organizationId, [created.id], new Date().getFullYear());
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "employee.create",
      entityType: "Employee",
      entityId: created.id,
      metadata: { name: fullName(created) },
    });
    createdId = created.id;
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/employees");
  redirect(`/employees/${createdId}`);
}

export async function updateEmployee(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const data = parsed.data;

  try {
    const user = await authorize("HR_MANAGER");
    if (data.managerId === id) {
      return { error: "An employee cannot be their own manager." };
    }
    await assertDepartmentInOrg(user.organizationId, data.departmentId);
    await assertEmployeeInOrg(user.organizationId, data.managerId);

    // Scope the update to the tenant so no cross-org record can be edited.
    const result = await prisma.employee.updateMany({
      where: { id, organizationId: user.organizationId },
      data: withProbationEnd(data),
    });
    if (result.count === 0) return { error: "Employee not found." };

    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "employee.update",
      entityType: "Employee",
      entityId: id,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function regularizeEmployee(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.employee.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { employmentStatus: "REGULAR", regularizedAt: new Date() },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "employee.regularize",
    entityType: "Employee",
    entityId: id,
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function deleteEmployee(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.employee.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "employee.delete",
    entityType: "Employee",
    entityId: id,
  });
  revalidatePath("/employees");
  redirect("/employees");
}
