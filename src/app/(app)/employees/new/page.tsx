import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createEmployee } from "@/lib/actions/employees";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage() {
  const user = await requireRole("HR_MANAGER");

  const [departments, managers, count] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.employee.count({ where: { organizationId: user.organizationId } }),
  ]);

  const suggested = `EMP-${String(count + 1).padStart(4, "0")}`;

  return (
    <div>
      <PageHeader
        title="Add employee"
        description="Create a new employee record."
      />
      <EmployeeForm
        action={createEmployee}
        departments={departments}
        managers={managers}
        suggestedEmployeeNumber={suggested}
        cancelHref="/employees"
      />
    </div>
  );
}
