import Link from "next/link";
import { Plus, HeartPulse, Pencil } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteBenefitPlan } from "@/lib/actions/benefits";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { BENEFIT_TYPE_LABELS } from "@/lib/constants";

export default async function BenefitPlansPage() {
  const user = await requireRole("HR_MANAGER");
  const currency = user.organization.currency;

  const plans = await prisma.benefitPlan.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Benefit plans"
        description="Define the plans employees can enroll in."
        action={
          <Link href="/benefits/plans/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Add plan
          </Link>
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-8 w-8" />}
          title="No benefit plans yet"
          description="Add health, life, or retirement plans for employees to enroll in."
          action={
            <Link href="/benefits/plans/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Add plan
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Plan</TH>
              <TH>Type</TH>
              <TH className="hidden sm:table-cell">EE / mo</TH>
              <TH className="hidden md:table-cell">Enrolled</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {plans.map((p) => (
              <TR key={p.id}>
                <TD>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {p.provider && (
                    <p className="text-xs text-slate-500">{p.provider}</p>
                  )}
                </TD>
                <TD>
                  <Badge tone="indigo">{BENEFIT_TYPE_LABELS[p.type]}</Badge>
                </TD>
                <TD className="hidden sm:table-cell">
                  {formatCurrency(p.employeeContribution, currency)}
                </TD>
                <TD className="hidden md:table-cell">{p._count.enrollments}</TD>
                <TD>
                  {p.isActive ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="slate">Inactive</Badge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/benefits/plans/${p.id}/edit`}
                      className={buttonVariants("secondary", "sm")}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteButton
                      action={deleteBenefitPlan.bind(null, p.id)}
                      size="sm"
                      confirmMessage={`Delete "${p.name}"? Enrollments will be removed.`}
                    >
                      Delete
                    </DeleteButton>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
