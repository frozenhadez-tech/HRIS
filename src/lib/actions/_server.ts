import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "./state";

/** Convert a Zod validation error into an ActionState. */
export function zodToState(error: z.ZodError): ActionState {
  const flat = z.flattenError(error);
  const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
  const formErrors = flat.formErrors as string[];
  const first = Object.values(fieldErrors).flat().find(Boolean) ?? formErrors[0];
  return {
    error: first ?? "Please check the form for errors.",
    fieldErrors,
  };
}

/** Map thrown errors (incl. Prisma constraint violations) to a friendly message. */
export function messageFor(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return "A record with these details already exists.";
    }
    if (e.code === "P2025") {
      return "The requested record was not found.";
    }
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

/** Ensure a department belongs to the tenant (guards against cross-tenant FKs). */
export async function assertDepartmentInOrg(
  organizationId: string,
  id: string | null,
): Promise<void> {
  if (!id) return;
  const found = await prisma.department.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!found) throw new Error("Selected department is invalid.");
}

/** Ensure an employee belongs to the tenant. */
export async function assertEmployeeInOrg(
  organizationId: string,
  id: string | null,
): Promise<void> {
  if (!id) return;
  const found = await prisma.employee.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!found) throw new Error("Selected employee is invalid.");
}
