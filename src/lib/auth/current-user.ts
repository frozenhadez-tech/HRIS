import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "./session";

// Resolve the authenticated user (with org + employee profile) once per request.
// React `cache` dedupes calls within a single render pass.
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { organization: true, employee: true },
  });

  if (!user || user.status === "SUSPENDED") return null;
  return user;
});

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;
