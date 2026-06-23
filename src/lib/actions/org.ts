"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { orgSettingsSchema } from "@/lib/validations";
import type { ActionState } from "./state";
import { zodToState, messageFor } from "./_server";

export async function updateOrgSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = orgSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { name, timezone, currency } = parsed.data;

  try {
    const admin = await authorize("ORG_ADMIN");
    await prisma.organization.update({
      where: { id: admin.organizationId },
      data: { name, timezone, currency },
    });
    await writeAudit({
      organizationId: admin.organizationId,
      userId: admin.id,
      action: "organization.update",
      entityType: "Organization",
      entityId: admin.organizationId,
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
