import { notFound } from "next/navigation";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { updateEmployee } from "@/lib/actions/employees";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeForm } from "../../employee-form";
import { fullName } from "@/lib/utils";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HR_MANAGER");

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!employee) notFound();

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, id: { not: id } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Edit ${fullName(employee)}`}
        description="Update this employee's record."
      />
      <EmployeeForm
        action={updateEmployee.bind(null, id)}
        defaults={employee}
        departments={departments}
        managers={managers}
        submitLabel="Save changes"
        cancelHref={`/employees/${id}`}
      />
    </div>
  );
}
