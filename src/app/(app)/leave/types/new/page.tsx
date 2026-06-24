import { requireRole } from "@/lib/tenant";
import { createLeaveType } from "@/lib/actions/leave";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveTypeForm } from "../leave-type-form";

export default async function NewLeaveTypePage() {
  await requireRole("HR_MANAGER");
  return (
    <div>
      <PageHeader title="Add leave type" description="Create a new leave type." />
      <LeaveTypeForm action={createLeaveType} />
    </div>
  );
}
