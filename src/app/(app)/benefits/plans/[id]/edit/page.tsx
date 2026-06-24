import { notFound } from "next/navigation";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { updateBenefitPlan } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { PlanForm } from "../../plan-form";

export default async function EditBenefitPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HR_MANAGER");

  const plan = await prisma.benefitPlan.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!plan) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${plan.name}`} description="Update this plan." />
      <PlanForm
        action={updateBenefitPlan.bind(null, id)}
        defaults={plan}
        submitLabel="Save changes"
      />
    </div>
  );
}
