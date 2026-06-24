import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PayslipView } from "@/components/payslip-view";

export default async function MyPayslipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireEmployee();

  const slip = await prisma.payslip.findFirst({
    where: {
      id,
      employeeId: me.employeeId,
      payrollRun: { status: { in: ["FINALIZED", "PAID"] } },
    },
    include: { employee: true, payrollRun: true },
  });
  if (!slip) notFound();

  return (
    <div>
      <Link
        href="/payslips"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to payslips
      </Link>

      <PageHeader title="Payslip" description={slip.payrollRun.label} />

      <PayslipView
        slip={slip}
        employee={slip.employee}
        run={slip.payrollRun}
        currency={me.organization.currency}
      />
    </div>
  );
}
