import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface AuditParams {
  organizationId: string;
  userId?: string | null;
  action: string; // e.g. "employee.create"
  entityType: string; // e.g. "Employee"
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Record an action in the audit trail. Never throws — auditing must not break flows. */
export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write log:", error);
  }
}
