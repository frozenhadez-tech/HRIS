import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "./auth/current-user";
import { roleAtLeast } from "./auth/rbac";

// Auth + tenant guards for server components and server actions.

/** Require an authenticated user, or redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require at least `min` role for page access (redirects on failure). */
export async function requireRole(min: UserRole): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, min)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

/**
 * Authorize a server action. Throws instead of redirecting so the caller can
 * surface the error in the form result.
 */
export async function authorize(min: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (!roleAtLeast(user.role, min)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return user;
}

/**
 * Scope a Prisma `where` clause to the current tenant. Always spread this into
 * tenant-scoped queries so no query can leak across organizations.
 */
export function tenantScope(organizationId: string) {
  return { organizationId };
}
