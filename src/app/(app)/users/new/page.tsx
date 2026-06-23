import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const admin = await requireRole("ORG_ADMIN");

  // Only offer employees that don't already have a login.
  const employees = await prisma.employee.findMany({
    where: { organizationId: admin.organizationId, user: { is: null } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div>
      <PageHeader
        title="Add user"
        description="Create a login and assign a role."
      />
      <UserForm employees={employees} />
    </div>
  );
}
