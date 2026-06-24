import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PayslipView } from "@/components/payslip-view";
import { PayslipEditForm } from "./payslip-edit-form";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; payslipId: string }>;
}) {
  const { id, payslipId } = await params;
  const user = await requireRole("HR_MANAGER");

  const slip = await prisma.payslip.findFirst({
    where: {
      id: payslipId,
      payrollRunId: id,
      organizationId: user.organizationId,
    },
    include: { employee: true, payrollRun: true },
  });
  if (!slip) notFound();

  return (
    <div>
      <Link
        href={`/payroll/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to run
      </Link>

      <PageHeader title="Payslip" description={slip.payrollRun.label} />

      <PayslipView
        slip={slip}
        employee={slip.employee}
        run={slip.payrollRun}
        currency={user.organization.currency}
      />

      {slip.payrollRun.status === "DRAFT" && (
        <Card className="mt-6">
          <CardHeader
            title="Adjustments"
            description="Edit allowance, overtime, and other items — totals recompute on save."
          />
          <CardBody>
            <PayslipEditForm
              payslipId={slip.id}
              defaults={{
                allowance: slip.allowance,
                overtimeHours: slip.overtimeHours,
                otherEarnings: slip.otherEarnings,
                otherDeductions: slip.otherDeductions,
                notes: slip.notes,
              }}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
