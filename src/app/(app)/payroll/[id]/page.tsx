import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  finalizePayrollRun,
  markPayrollPaid,
  deletePayrollRun,
} from "@/lib/actions/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { PayrollStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fullName, formatDate, formatCurrency } from "@/lib/utils";
import { FREQUENCY_LABELS } from "@/lib/payroll";

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("HR_MANAGER");
  const currency = user.organization.currency;

  const run = await prisma.payrollRun.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      payslips: {
        include: {
          employee: { select: { firstName: true, lastName: true, jobTitle: true } },
        },
        orderBy: [{ employee: { lastName: "asc" } }],
      },
    },
  });
  if (!run) notFound();

  const totals = run.payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + p.grossPay,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netPay,
      employer: acc.employer + p.sssEr + p.philHealthEr + p.pagIbigEr,
    }),
    { gross: 0, deductions: 0, net: 0, employer: 0 },
  );

  const stats = [
    { label: "Gross", value: totals.gross },
    { label: "Deductions", value: totals.deductions },
    { label: "Net pay", value: totals.net },
    { label: "Employer cost", value: totals.employer },
  ];

  return (
    <div>
      <Link
        href="/payroll"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to payroll
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {run.label}
            <PayrollStatusBadge status={run.status} />
          </span>
        }
        description={`${FREQUENCY_LABELS[run.frequency]} · ${formatDate(
          run.periodStart,
        )} – ${formatDate(run.periodEnd)} · pay ${formatDate(run.payDate)}`}
        action={
          <div className="flex items-center gap-2">
            {run.status === "DRAFT" && (
              <>
                <form action={finalizePayrollRun.bind(null, run.id)}>
                  <button className={buttonVariants("primary")}>Finalize</button>
                </form>
                <DeleteButton
                  action={deletePayrollRun.bind(null, run.id)}
                  confirmMessage="Delete this draft payroll run and its payslips?"
                >
                  Delete
                </DeleteButton>
              </>
            )}
            {run.status === "FINALIZED" && (
              <form action={markPayrollPaid.bind(null, run.id)}>
                <button className={buttonVariants("primary")}>
                  Mark as paid
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(s.value, currency)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {run.status === "DRAFT" && (
        <p className="mb-3 text-sm text-slate-500">
          This run is a draft — click an employee to review and adjust their
          payslip, then Finalize.
        </p>
      )}

      <Table>
        <THead>
          <TR>
            <TH>Employee</TH>
            <TH className="hidden sm:table-cell">Gross</TH>
            <TH className="hidden sm:table-cell">Deductions</TH>
            <TH>Net pay</TH>
          </TR>
        </THead>
        <TBody>
          {run.payslips.map((p) => (
            <TR key={p.id}>
              <TD>
                <Link
                  href={`/payroll/${run.id}/${p.id}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {fullName(p.employee)}
                </Link>
                <span className="block text-xs text-slate-500">
                  {p.employee.jobTitle ?? "—"}
                </span>
              </TD>
              <TD className="hidden sm:table-cell text-slate-600">
                {formatCurrency(p.grossPay, currency)}
              </TD>
              <TD className="hidden sm:table-cell text-slate-600">
                {formatCurrency(p.totalDeductions, currency)}
              </TD>
              <TD className="font-medium">
                {formatCurrency(p.netPay, currency)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
