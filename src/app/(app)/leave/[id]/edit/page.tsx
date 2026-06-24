import { notFound, redirect } from "next/navigation";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { updateLeaveRequest } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveRequestForm } from "../../leave-request-form";

export default async function EditLeavePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireEmployee();

  const request = await prisma.leaveRequest.findFirst({
    where: { id, organizationId: me.organizationId, employeeId: me.employeeId },
  });
  if (!request) notFound();
  if (request.status !== "PENDING") redirect("/leave");

  const leaveTypes = await prisma.leaveType.findMany({
    where: { organizationId: me.organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, paid: true },
  });

  return (
    <div>
      <PageHeader
        title="Edit leave request"
        description="Update your pending request."
      />
      <LeaveRequestForm
        action={updateLeaveRequest.bind(null, id)}
        leaveTypes={leaveTypes}
        defaults={request}
        submitLabel="Save changes"
      />
    </div>
  );
}
