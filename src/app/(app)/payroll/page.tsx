import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PayrollStatusBadge } from "@/components/status-badges";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FREQUENCY_LABELS } from "@/lib/payroll";

export default async function PayrollPage() {
  const user = await requireRole("HR_MANAGER");
  const currency = user.organization.currency;

  const runs = await prisma.payrollRun.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { periodStart: "desc" },
    include: {
      _count: { select: { payslips: true } },
      payslips: { select: { netPay: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Generate runs, review payslips, and finalize pay."
        action={
          <Link href="/payroll/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Run payroll
          </Link>
        }
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No payroll runs yet"
          description="Create your first run to generate payslips. Make sure employees have a monthly salary set."
          action={
            <Link href="/payroll/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Run payroll
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Run</TH>
              <TH className="hidden sm:table-cell">Period</TH>
              <TH className="hidden md:table-cell">Frequency</TH>
              <TH>Payslips</TH>
              <TH>Net total</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {runs.map((run) => {
              const net = run.payslips.reduce((s, p) => s + p.netPay, 0);
              return (
                <TR key={run.id}>
                  <TD>
                    <Link
                      href={`/payroll/${run.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {run.label}
                    </Link>
                  </TD>
                  <TD className="hidden sm:table-cell text-slate-500">
                    {formatDate(run.periodStart)} – {formatDate(run.periodEnd)}
                  </TD>
                  <TD className="hidden md:table-cell">
                    {FREQUENCY_LABELS[run.frequency]}
                  </TD>
                  <TD>{run._count.payslips}</TD>
                  <TD className="font-medium">
                    {formatCurrency(net, currency)}
                  </TD>
                  <TD>
                    <PayrollStatusBadge status={run.status} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
