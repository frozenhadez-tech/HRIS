import Link from "next/link";
import { HeartPulse, Users, SlidersHorizontal, ClipboardList, Check } from "lucide-react";
import { requireUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { enrollInPlan, cancelEnrollment } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, fullName } from "@/lib/utils";
import { BENEFIT_TYPES, BENEFIT_TYPE_LABELS } from "@/lib/constants";

export default async function BenefitsPage() {
  const user = await requireUser();
  const orgId = user.organizationId;
  const currency = user.organization.currency;
  const myEmpId = user.employeeId;
  const isHR = can.manageBenefits(user.role);

  const [plans, myEnrollments] = await Promise.all([
    prisma.benefitPlan.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    myEmpId
      ? prisma.benefitEnrollment.findMany({
          where: { organizationId: orgId, employeeId: myEmpId, status: "ACTIVE" },
          include: { plan: true, coveredDependents: true },
        })
      : Promise.resolve([]),
  ]);

  const enrolledPlanIds = new Set(myEnrollments.map((e) => e.planId));

  return (
    <div>
      <PageHeader
        title="Benefits"
        description="Enroll in the plans available to you."
        action={
          <div className="flex items-center gap-2">
            {myEmpId && (
              <Link href="/benefits/dependents" className={buttonVariants("secondary")}>
                <Users className="h-4 w-4" /> Dependents
              </Link>
            )}
            {isHR && (
              <>
                <Link href="/benefits/enrollments" className={buttonVariants("secondary")}>
                  <ClipboardList className="h-4 w-4" /> Enrollments
                </Link>
                <Link href="/benefits/plans" className={buttonVariants("secondary")}>
                  <SlidersHorizontal className="h-4 w-4" /> Manage plans
                </Link>
              </>
            )}
          </div>
        }
      />

      {!myEmpId && (
        <Alert tone="info" className="mb-6">
          Your account isn&apos;t linked to an employee profile, so you can&apos;t
          enroll. You can still manage plans as an admin.
        </Alert>
      )}

      {myEmpId && (
        <Card className="mb-6">
          <CardHeader title="Your enrollments" />
          <CardBody className="p-0">
            {myEnrollments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                You&apos;re not enrolled in any benefits yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myEnrollments.map((en) => (
                  <li key={en.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {en.plan.name}{" "}
                        <Badge tone="indigo">{BENEFIT_TYPE_LABELS[en.plan.type]}</Badge>
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(en.plan.employeeContribution, currency)}/mo
                        {en.coveredDependents.length > 0 &&
                          ` · covers ${en.coveredDependents
                            .map((d) => fullName(d))
                            .join(", ")}`}
                      </p>
                    </div>
                    <DeleteButton
                      action={cancelEnrollment.bind(null, en.id)}
                      size="sm"
                      confirmMessage={`Cancel your enrollment in ${en.plan.name}?`}
                    >
                      Cancel
                    </DeleteButton>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <h2 className="mb-3 font-semibold text-slate-900">Available plans</h2>
      {plans.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-8 w-8" />}
          title="No plans available"
          description={
            isHR
              ? "Add benefit plans for employees to enroll in."
              : "Your HR team hasn't published any benefit plans yet."
          }
          action={
            isHR ? (
              <Link href="/benefits/plans/new" className={buttonVariants()}>
                Add plan
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {BENEFIT_TYPES.filter((t) => plans.some((p) => p.type === t)).map(
            (type) => (
              <div key={type}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {BENEFIT_TYPE_LABELS[type]}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans
                    .filter((p) => p.type === type)
                    .map((p) => {
                      const enrolled = enrolledPlanIds.has(p.id);
                      return (
                        <Card key={p.id} className="flex flex-col p-5">
                          <h3 className="font-semibold text-slate-900">{p.name}</h3>
                          {p.provider && (
                            <p className="text-xs text-slate-500">{p.provider}</p>
                          )}
                          {p.description && (
                            <p className="mt-2 text-sm text-slate-600">
                              {p.description}
                            </p>
                          )}
                          <dl className="mt-3 space-y-1 text-xs text-slate-500">
                            {p.coverageAmount != null && (
                              <div className="flex justify-between">
                                <dt>Coverage</dt>
                                <dd className="font-medium text-slate-700">
                                  {formatCurrency(p.coverageAmount, currency)}
                                </dd>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <dt>Your share / mo</dt>
                              <dd className="font-medium text-slate-700">
                                {formatCurrency(p.employeeContribution, currency)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Employer / mo</dt>
                              <dd className="font-medium text-slate-700">
                                {formatCurrency(p.employerContribution, currency)}
                              </dd>
                            </div>
                          </dl>
                          <div className="mt-4 pt-1">
                            {!myEmpId ? null : enrolled ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                                <Check className="h-4 w-4" /> Enrolled
                              </span>
                            ) : p.type === "HEALTH" ? (
                              <Link
                                href={`/benefits/enroll/${p.id}`}
                                className={buttonVariants("primary", "sm")}
                              >
                                Enroll
                              </Link>
                            ) : (
                              <form action={enrollInPlan.bind(null, p.id)}>
                                <Button type="submit" size="sm">
                                  Enroll
                                </Button>
                              </form>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
