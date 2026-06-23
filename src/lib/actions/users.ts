"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema } from "@/lib/validations";
import type { ActionState } from "./state";
import { zodToState, messageFor, assertEmployeeInOrg } from "./_server";

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { email, password, role, employeeId } = parsed.data;

  try {
    const admin = await authorize("ORG_ADMIN");
    await assertEmployeeInOrg(admin.organizationId, employeeId);

    if (employeeId) {
      const linked = await prisma.user.findUnique({ where: { employeeId } });
      if (linked) {
        return { error: "That employee already has a user account." };
      }
    }

    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        organizationId: admin.organizationId,
        email,
        passwordHash,
        role,
        status: "ACTIVE",
        employeeId: employeeId ?? null,
      },
    });
    await writeAudit({
      organizationId: admin.organizationId,
      userId: admin.id,
      action: "user.create",
      entityType: "User",
      entityId: created.id,
      metadata: { email, role },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { role, status } = parsed.data;

  try {
    const admin = await authorize("ORG_ADMIN");
    if (id === admin.id && (role !== "ORG_ADMIN" || status !== "ACTIVE")) {
      return {
        error: "You cannot change your own role or status (lockout safety).",
      };
    }

    const result = await prisma.user.updateMany({
      where: { id, organizationId: admin.organizationId },
      data: { role, status },
    });
    if (result.count === 0) return { error: "User not found." };

    await writeAudit({
      organizationId: admin.organizationId,
      userId: admin.id,
      action: "user.update",
      entityType: "User",
      entityId: id,
      metadata: { role, status },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string): Promise<void> {
  const admin = await authorize("ORG_ADMIN");
  if (id === admin.id) {
    throw new Error("You cannot delete your own account.");
  }
  await prisma.user.deleteMany({
    where: { id, organizationId: admin.organizationId },
  });
  await writeAudit({
    organizationId: admin.organizationId,
    userId: admin.id,
    action: "user.delete",
    entityType: "User",
    entityId: id,
  });
  revalidatePath("/users");
  redirect("/users");
}
