"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { departmentSchema } from "@/lib/validations";
import type { ActionState } from "./state";
import {
  zodToState,
  messageFor,
  assertDepartmentInOrg,
  assertEmployeeInOrg,
} from "./_server";

export async function createDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = departmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const data = parsed.data;

  try {
    const user = await authorize("HR_MANAGER");
    await assertDepartmentInOrg(user.organizationId, data.parentId);
    await assertEmployeeInOrg(user.organizationId, data.headId);

    const created = await prisma.department.create({
      data: { organizationId: user.organizationId, ...data },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "department.create",
      entityType: "Department",
      entityId: created.id,
      metadata: { name: created.name },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/departments");
  redirect("/departments");
}

export async function updateDepartment(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = departmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const data = parsed.data;

  try {
    const user = await authorize("HR_MANAGER");
    if (data.parentId === id) {
      return { error: "A department cannot be its own parent." };
    }
    await assertDepartmentInOrg(user.organizationId, data.parentId);
    await assertEmployeeInOrg(user.organizationId, data.headId);

    const result = await prisma.department.updateMany({
      where: { id, organizationId: user.organizationId },
      data,
    });
    if (result.count === 0) return { error: "Department not found." };

    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "department.update",
      entityType: "Department",
      entityId: id,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/departments");
  redirect("/departments");
}

export async function deleteDepartment(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.department.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "department.delete",
    entityType: "Department",
    entityId: id,
  });
  revalidatePath("/departments");
  redirect("/departments");
}
