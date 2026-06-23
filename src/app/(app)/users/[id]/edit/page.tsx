import { notFound } from "next/navigation";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireRole("ORG_ADMIN");

  const target = await prisma.user.findFirst({
    where: { id, organizationId: admin.organizationId },
  });
  if (!target) notFound();

  return (
    <div>
      <PageHeader title="Edit user" description="Manage role and access." />
      <EditUserForm
        id={target.id}
        email={target.email}
        role={target.role}
        status={target.status}
        isSelf={target.id === admin.id}
      />
    </div>
  );
}
