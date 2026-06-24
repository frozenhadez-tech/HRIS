import Link from "next/link";
import { Plus, CalendarDays, Pencil } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function LeaveTypesPage() {
  const user = await requireRole("HR_MANAGER");

  const types = await prisma.leaveType.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { requests: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Leave types"
        description="Configure the kinds of leave employees can request."
        action={
          <Link href="/leave/types/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Add leave type
          </Link>
        }
      />

      {types.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="No leave types yet"
          description="Add types like Vacation, Sick, or Unpaid leave."
          action={
            <Link href="/leave/types/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Add leave type
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Default days</TH>
              <TH>Paid</TH>
              <TH>Status</TH>
              <TH className="hidden sm:table-cell">Requests</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {types.map((t) => (
              <TR key={t.id}>
                <TD>
                  <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: t.colorHex ?? "#6366f1" }}
                    />
                    {t.name}
                  </span>
                </TD>
                <TD>{t.defaultAllocationDays}</TD>
                <TD>
                  {t.paid ? (
                    <Badge tone="indigo">Paid</Badge>
                  ) : (
                    <Badge tone="slate">Unpaid</Badge>
                  )}
                </TD>
                <TD>
                  {t.isActive ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="slate">Inactive</Badge>
                  )}
                </TD>
                <TD className="hidden sm:table-cell">{t._count.requests}</TD>
                <TD>
                  <div className="flex justify-end">
                    <Link
                      href={`/leave/types/${t.id}/edit`}
                      className={buttonVariants("secondary", "sm")}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
