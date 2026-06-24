import type { Payslip, Employee, PayrollRun } from "@prisma/client";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { FREQUENCY_LABELS } from "@/lib/payroll";

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={strong ? "font-medium text-slate-900" : "text-slate-600"}>
        {label}
      </span>
      <span
        className={strong ? "font-semibold text-slate-900" : "text-slate-700"}
      >
        {value}
      </span>
    </div>
  );
}

export function PayslipView({
  slip,
  employee,
  run,
  currency,
}: {
  slip: Payslip;
  employee: Pick<
    Employee,
    "firstName" | "lastName" | "jobTitle" | "employeeNumber"
  >;
  run: Pick<
    PayrollRun,
    "label" | "frequency" | "periodStart" | "periodEnd" | "payDate"
  >;
  currency: string;
}) {
  const c = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {fullName(employee)}
            </p>
            <p className="text-sm text-slate-500">
              {employee.jobTitle ?? "—"} · {employee.employeeNumber}
            </p>
          </div>
          <div className="text-sm text-slate-500 sm:text-right">
            <p className="font-medium text-slate-700">
              {run.label} · {FREQUENCY_LABELS[run.frequency]}
            </p>
            <p>
              {formatDate(run.periodStart)} – {formatDate(run.periodEnd)}
            </p>
            <p>Pay date: {formatDate(run.payDate)}</p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Earnings" />
          <CardBody>
            <Row label="Basic pay" value={c(slip.basicPay)} />
            <Row label="Allowance" value={c(slip.allowance)} />
            <Row
              label={`Overtime (${slip.overtimeHours}h)`}
              value={c(slip.overtimePay)}
            />
            <Row label="Other earnings" value={c(slip.otherEarnings)} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Row label="Gross pay" value={c(slip.grossPay)} strong />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Deductions" />
          <CardBody>
            <Row label="SSS" value={c(slip.sss)} />
            <Row label="PhilHealth" value={c(slip.philHealth)} />
            <Row label="Pag-IBIG" value={c(slip.pagIbig)} />
            <Row label="Withholding tax" value={c(slip.withholdingTax)} />
            <Row
              label={`Unpaid leave (${slip.unpaidLeaveDays}d)`}
              value={c(slip.absenceDeduction)}
            />
            <Row label="Other deductions" value={c(slip.otherDeductions)} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Row
                label="Total deductions"
                value={c(slip.totalDeductions)}
                strong
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex items-center justify-between bg-indigo-50/40">
          <span className="text-sm font-medium text-slate-500">Net pay</span>
          <span className="text-2xl font-bold text-slate-900">
            {c(slip.netPay)}
          </span>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Employer contributions"
          description="Paid by the company — not deducted from pay."
        />
        <CardBody className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">SSS</p>
            <p className="font-medium text-slate-900">{c(slip.sssEr)}</p>
          </div>
          <div>
            <p className="text-slate-500">PhilHealth</p>
            <p className="font-medium text-slate-900">{c(slip.philHealthEr)}</p>
          </div>
          <div>
            <p className="text-slate-500">Pag-IBIG</p>
            <p className="font-medium text-slate-900">{c(slip.pagIbigEr)}</p>
          </div>
        </CardBody>
      </Card>

      {slip.notes && (
        <Card>
          <CardHeader title="Notes" />
          <CardBody>
            <p className="text-sm text-slate-600">{slip.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
