import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { enrollInPlan } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency, fullName } from "@/lib/utils";
import { DEPENDENT_RELATION_LABELS } from "@/lib/constants";

export default async function EnrollHealthPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const me = await requireEmployee();
  const currency = me.organization.currency;

  const plan = await prisma.benefitPlan.findFirst({
    where: {
      id: planId,
      organizationId: me.organizationId,
      type: "HEALTH",
      isActive: true,
    },
  });
  if (!plan) redirect("/benefits");

  const dependents = await prisma.dependent.findMany({
    where: { employeeId: me.employeeId, organizationId: me.organizationId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <Link
        href="/benefits"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to benefits
      </Link>

      <PageHeader title={`Enroll — ${plan.name}`} description={plan.provider ?? "Health plan"} />

      <form action={enrollInPlan.bind(null, plan.id)} className="space-y-6">
        <Card>
          <CardHeader title="Plan" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Your share / mo</dt>
                <dd className="font-medium text-slate-900">
                  {formatCurrency(plan.employeeContribution, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Coverage</dt>
                <dd className="font-medium text-slate-900">
                  {plan.coverageAmount != null
                    ? formatCurrency(plan.coverageAmount, currency)
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cover dependents"
            description="Select dependents to include under this health plan."
            action={
              <Link href="/benefits/dependents" className={buttonVariants("secondary", "sm")}>
                Manage dependents
              </Link>
            }
          />
          <CardBody>
            {dependents.length === 0 ? (
              <p className="text-sm text-slate-500">
                No dependents on file. You can still enroll yourself, or add
                dependents first.
              </p>
            ) : (
              <ul className="space-y-2">
                {dependents.map((d) => (
                  <li key={d.id}>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        name="dependentIds"
                        value={d.id}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-900">
                        {fullName(d)}
                      </span>
                      <span className="text-slate-500">
                        {DEPENDENT_RELATION_LABELS[d.relation]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/benefits">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Confirm enrollment</Button>
        </div>
      </form>
    </div>
  );
}
