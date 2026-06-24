import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireEmployee } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PayrollStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function PayslipsPage() {
  const me = await requireEmployee();
  const currency = me.organization.currency;

  const payslips = await prisma.payslip.findMany({
    where: {
      employeeId: me.employeeId,
      payrollRun: { status: { in: ["FINALIZED", "PAID"] } },
    },
    include: { payrollRun: true },
    orderBy: { payrollRun: { periodStart: "desc" } },
  });

  return (
    <div>
      <PageHeader title="My payslips" description="Your finalized payslips." />

      {payslips.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="No payslips yet"
          description="Your payslips will appear here once payroll is finalized."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Period</TH>
              <TH className="hidden sm:table-cell">Pay date</TH>
              <TH>Net pay</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {payslips.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link
                    href={`/payslips/${p.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {p.payrollRun.label}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    {formatDate(p.payrollRun.periodStart)} –{" "}
                    {formatDate(p.payrollRun.periodEnd)}
                  </span>
                </TD>
                <TD className="hidden sm:table-cell text-slate-500">
                  {formatDate(p.payrollRun.payDate)}
                </TD>
                <TD className="font-medium">
                  {formatCurrency(p.netPay, currency)}
                </TD>
                <TD>
                  <PayrollStatusBadge status={p.payrollRun.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
