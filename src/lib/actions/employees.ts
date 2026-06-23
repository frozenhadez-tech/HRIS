"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { employeeSchema } from "@/lib/validations";
import { fullName } from "@/lib/utils";
import type { ActionState } from "./state";
import {
  zodToState,
  messageFor,
  assertDepartmentInOrg,
  assertEmployeeInOrg,
} from "./_server";

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
      data: { organizationId: user.organizationId, ...data },
    });
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
      data,
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
