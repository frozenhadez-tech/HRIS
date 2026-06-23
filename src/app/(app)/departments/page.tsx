import Link from "next/link";
import { Plus, Building2, Pencil } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { deleteDepartment } from "@/lib/actions/departments";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName } from "@/lib/utils";

export default async function DepartmentsPage() {
  const user = await requireRole("MANAGER");
  const canManage = can.manageDepartments(user.role);

  const departments = await prisma.department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: {
      parent: { select: { name: true } },
      head: { select: { firstName: true, lastName: true } },
      _count: { select: { employees: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organize your workforce into teams and units."
        action={
          canManage && (
            <Link href="/departments/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Add department
            </Link>
          )
        }
      />

      {departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No departments yet"
          description="Create departments to group employees and build your org structure."
          action={
            canManage ? (
              <Link href="/departments/new" className={buttonVariants()}>
                <Plus className="h-4 w-4" /> Add department
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH className="hidden sm:table-cell">Parent</TH>
              <TH className="hidden md:table-cell">Head</TH>
              <TH>Employees</TH>
              {canManage && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {departments.map((dept) => (
              <TR key={dept.id}>
                <TD>
                  <p className="font-medium text-slate-900">{dept.name}</p>
                  {dept.description && (
                    <p className="max-w-xs truncate text-xs text-slate-500">
                      {dept.description}
                    </p>
                  )}
                </TD>
                <TD className="hidden sm:table-cell">
                  {dept.parent?.name ?? "—"}
                </TD>
                <TD className="hidden md:table-cell">
                  {dept.head ? fullName(dept.head) : "—"}
                </TD>
                <TD>{dept._count.employees}</TD>
                {canManage && (
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/departments/${dept.id}/edit`}
                        className={buttonVariants("secondary", "sm")}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <DeleteButton
                        action={deleteDepartment.bind(null, dept.id)}
                        size="sm"
                        confirmMessage={`Delete "${dept.name}"? Employees will be unassigned.`}
                      >
                        Delete
                      </DeleteButton>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
