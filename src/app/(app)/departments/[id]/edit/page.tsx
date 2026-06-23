import { notFound } from "next/navigation";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { updateDepartment } from "@/lib/actions/departments";
import { PageHeader } from "@/components/ui/page-header";
import { DepartmentForm } from "../../department-form";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HR_MANAGER");

  const department = await prisma.department.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!department) notFound();

  const [parents, employees] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: user.organizationId, id: { not: id } },
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
        title={`Edit ${department.name}`}
        description="Update this department."
      />
      <DepartmentForm
        action={updateDepartment.bind(null, id)}
        defaults={department}
        parents={parents}
        employees={employees}
        submitLabel="Save changes"
        cancelHref="/departments"
      />
    </div>
  );
}
