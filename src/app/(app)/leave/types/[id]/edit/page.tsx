import { notFound } from "next/navigation";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { updateLeaveType } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveTypeForm } from "../../leave-type-form";

export default async function EditLeaveTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HR_MANAGER");

  const leaveType = await prisma.leaveType.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!leaveType) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${leaveType.name}`}
        description="Update this leave type."
      />
      <LeaveTypeForm
        action={updateLeaveType.bind(null, id)}
        defaults={leaveType}
        submitLabel="Save changes"
      />
    </div>
  );
}
