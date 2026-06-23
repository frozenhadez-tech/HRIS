"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSession, clearSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { signupSchema, loginSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import type { ActionState } from "./state";
import { zodToState, messageFor } from "./_server";

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const { organizationName, firstName, lastName, email, password } =
    parsed.data;

  // Pick a globally-unique tenant slug.
  const base = slugify(organizationName) || "org";
  let slug = base;
  for (let i = 0; i < 6; i += 1) {
    const exists = await prisma.organization.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName, slug },
      });
      const employee = await tx.employee.create({
        data: {
          organizationId: org.id,
          employeeNumber: "EMP-0001",
          firstName,
          lastName,
          email,
          jobTitle: "Administrator",
          status: "ACTIVE",
          employmentType: "FULL_TIME",
          hireDate: new Date(),
        },
      });
      return tx.user.create({
        data: {
          organizationId: org.id,
          email,
          passwordHash,
          role: "ORG_ADMIN",
          status: "ACTIVE",
          employeeId: employee.id,
        },
      });
    });
  } catch (e) {
    return { error: messageFor(e) };
  }

  await setSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
  });
  await writeAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "organization.create",
    entityType: "Organization",
    entityId: user.organizationId,
  });

  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const { email, password } = parsed.data;

  // Email may exist in more than one tenant; match the first by password.
  const candidates = await prisma.user.findMany({ where: { email } });
  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (candidate.status === "SUSPENDED") continue;
    if (await verifyPassword(password, candidate.passwordHash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    return { error: "Invalid email or password." };
  }

  await prisma.user.update({
    where: { id: matched.id },
    data: { lastLoginAt: new Date() },
  });
  await setSession({
    userId: matched.id,
    organizationId: matched.organizationId,
    role: matched.role,
    email: matched.email,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
