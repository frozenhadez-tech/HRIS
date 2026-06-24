import { redirect } from "next/navigation";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createLeaveRequest } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveRequestForm } from "../leave-request-form";

export default async function NewLeaveRequestPage() {
  const me = await requireEmployee();

  const leaveTypes = await prisma.leaveType.findMany({
    where: { organizationId: me.organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, paid: true },
  });

  if (leaveTypes.length === 0) redirect("/leave");

  return (
    <div>
      <PageHeader
        title="Request leave"
        description="Submit a new time-off request."
      />
      <LeaveRequestForm action={createLeaveRequest} leaveTypes={leaveTypes} />
    </div>
  );
}
