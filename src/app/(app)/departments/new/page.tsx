import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createDepartment } from "@/lib/actions/departments";
import { PageHeader } from "@/components/ui/page-header";
import { DepartmentForm } from "../department-form";

export default async function NewDepartmentPage() {
  const user = await requireRole("HR_MANAGER");

  const [parents, employees] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        title="Add department"
        description="Create a new department or team."
      />
      <DepartmentForm
        action={createDepartment}
        parents={parents}
        employees={employees}
        cancelHref="/departments"
      />
    </div>
  );
}
