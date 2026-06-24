import "server-only";
import { prisma } from "@/lib/prisma";

export type LeaveCredit = {
  leaveTypeId: string;
  name: string;
  paid: boolean;
  allocated: number;
  used: number;
  pending: number;
  available: number;
};

/**
 * Per-leave-type credits for one employee in a given year: allocated (an
 * explicit balance row, else the type's default allocation), used, pending,
 * and available (= allocated − used − pending).
 *
 * This mirrors the math `createLeaveRequest` enforces, so the "available"
 * number an employee sees matches what they can actually book. Unpaid types
 * carry no limit — `available`/`allocated` are still returned but the UI
 * shows them as unlimited.
 */
export async function getLeaveCredits(
  organizationId: string,
  employeeId: string,
  year: number,
): Promise<LeaveCredit[]> {
  const [types, balances, pending] = await Promise.all([
    prisma.leaveType.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.leaveBalance.findMany({
      where: { organizationId, employeeId, year },
    }),
    prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: {
        organizationId,
        employeeId,
        status: "PENDING",
        startDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
      _sum: { days: true },
    }),
  ]);

  const balByType = new Map(balances.map((b) => [b.leaveTypeId, b]));
  const pendByType = new Map(
    pending.map((p) => [p.leaveTypeId, p._sum.days ?? 0]),
  );

  return types.map((t) => {
    const bal = balByType.get(t.id);
    const allocated = bal?.allocatedDays ?? t.defaultAllocationDays;
    const used = bal?.usedDays ?? 0;
    const pendingDays = pendByType.get(t.id) ?? 0;
    return {
      leaveTypeId: t.id,
      name: t.name,
      paid: t.paid,
      allocated,
      used,
      pending: pendingDays,
      available: allocated - used - pendingDays,
    };
  });
}
