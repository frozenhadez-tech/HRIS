import { requireRole } from "@/lib/tenant";
import { createBenefitPlan } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { PlanForm } from "../plan-form";

export default async function NewBenefitPlanPage() {
  await requireRole("HR_MANAGER");
  return (
    <div>
      <PageHeader title="Add benefit plan" description="Create a new plan." />
      <PlanForm action={createBenefitPlan} />
    </div>
  );
}
