"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize, authorizeEmployee } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { benefitPlanSchema, dependentSchema } from "@/lib/validations";
import type { ActionState } from "./state";
import { zodToState, messageFor } from "./_server";

// ---------------------------------------------------------------------------
// HR: benefit plans
// ---------------------------------------------------------------------------

export async function createBenefitPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = benefitPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    const created = await prisma.benefitPlan.create({
      data: { organizationId: user.organizationId, ...parsed.data },
    });
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "benefit.plan.create",
      entityType: "BenefitPlan",
      entityId: created.id,
      metadata: { name: created.name, type: created.type },
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/benefits/plans");
  redirect("/benefits/plans");
}

export async function updateBenefitPlan(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = benefitPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const user = await authorize("HR_MANAGER");
    const result = await prisma.benefitPlan.updateMany({
      where: { id, organizationId: user.organizationId },
      data: parsed.data,
    });
    if (result.count === 0) return { error: "Plan not found." };
    await writeAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "benefit.plan.update",
      entityType: "BenefitPlan",
      entityId: id,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/benefits/plans");
  redirect("/benefits/plans");
}

export async function deleteBenefitPlan(id: string): Promise<void> {
  const user = await authorize("HR_MANAGER");
  await prisma.benefitPlan.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "benefit.plan.delete",
    entityType: "BenefitPlan",
    entityId: id,
  });
  revalidatePath("/benefits/plans");
  redirect("/benefits/plans");
}

// ---------------------------------------------------------------------------
// Employee self-service: enrollment + dependents
// ---------------------------------------------------------------------------

export async function enrollInPlan(
  planId: string,
  formData: FormData,
): Promise<void> {
  const me = await authorizeEmployee();
  const plan = await prisma.benefitPlan.findFirst({
    where: { id: planId, organizationId: me.organizationId },
  });
  if (!plan || !plan.isActive) throw new Error("This plan isn't available.");

  // Dependents apply to health plans only; verify they belong to this employee.
  let dependentIds: string[] = [];
  if (plan.type === "HEALTH") {
    const ids = formData.getAll("dependentIds").map(String).filter(Boolean);
    if (ids.length) {
      const mine = await prisma.dependent.findMany({
        where: {
          id: { in: ids },
          employeeId: me.employeeId,
          organizationId: me.organizationId,
        },
        select: { id: true },
      });
      dependentIds = mine.map((d) => d.id);
    }
  }

  await prisma.benefitEnrollment.upsert({
    where: { employeeId_planId: { employeeId: me.employeeId, planId } },
    create: {
      organizationId: me.organizationId,
      employeeId: me.employeeId,
      planId,
      status: "ACTIVE",
      coveredDependents: { connect: dependentIds.map((id) => ({ id })) },
    },
    update: {
      status: "ACTIVE",
      cancelledAt: null,
      enrolledAt: new Date(),
      coveredDependents: { set: dependentIds.map((id) => ({ id })) },
    },
  });
  await writeAudit({
    organizationId: me.organizationId,
    userId: me.id,
    action: "benefit.enroll",
    entityType: "BenefitPlan",
    entityId: planId,
  });
  revalidatePath("/benefits");
  redirect("/benefits");
}

export async function cancelEnrollment(id: string): Promise<void> {
  const me = await authorizeEmployee();
  await prisma.benefitEnrollment.updateMany({
    where: { id, organizationId: me.organizationId, employeeId: me.employeeId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await writeAudit({
    organizationId: me.organizationId,
    userId: me.id,
    action: "benefit.cancel",
    entityType: "BenefitEnrollment",
    entityId: id,
  });
  revalidatePath("/benefits");
  redirect("/benefits");
}

export async function addDependent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = dependentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  try {
    const me = await authorizeEmployee();
    await prisma.dependent.create({
      data: {
        organizationId: me.organizationId,
        employeeId: me.employeeId,
        ...parsed.data,
      },
    });
    await writeAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: "dependent.create",
      entityType: "Dependent",
    });
  } catch (e) {
    return { error: messageFor(e) };
  }
  revalidatePath("/benefits/dependents");
  redirect("/benefits/dependents");
}

export async function deleteDependent(id: string): Promise<void> {
  const me = await authorizeEmployee();
  await prisma.dependent.deleteMany({
    where: { id, organizationId: me.organizationId, employeeId: me.employeeId },
  });
  await writeAudit({
    organizationId: me.organizationId,
    userId: me.id,
    action: "dependent.delete",
    entityType: "Dependent",
    entityId: id,
  });
  revalidatePath("/benefits/dependents");
  redirect("/benefits/dependents");
}
