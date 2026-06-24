"use client";

import { useActionState } from "react";
import { updatePayslip } from "@/lib/actions/payroll";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export interface PayslipDefaults {
  allowance: number;
  overtimeHours: number;
  otherEarnings: number;
  sss: number;
  philHealth: number;
  pagIbig: number;
  withholdingTax: number;
  absenceDeduction: number;
  otherDeductions: number;
  sssEr: number;
  philHealthEr: number;
  pagIbigEr: number;
  notes: string | null;
}

// Module-level so inputs aren't remounted (and cleared) on a re-render.
function MoneyField({
  name,
  label,
  value,
  step = "0.01",
  error,
}: {
  name: string;
  label: string;
  value: number;
  step?: string;
  error?: string[];
}) {
  return (
    <Field label={label} htmlFor={name} error={error}>
      <Input id={name} name={name} type="number" min={0} step={step} defaultValue={value} />
    </Field>
  );
}

export function PayslipEditForm({
  payslipId,
  defaults,
}: {
  payslipId: string;
  defaults: PayslipDefaults;
}) {
  const [state, action] = useActionState(
    updatePayslip.bind(null, payslipId),
    emptyState,
  );
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Card>
        <CardHeader title="Earnings" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <MoneyField name="allowance" label="Allowance" value={defaults.allowance} error={e.allowance} />
          <MoneyField name="overtimeHours" label="Overtime hours" value={defaults.overtimeHours} step="0.5" error={e.overtimeHours} />
          <MoneyField name="otherEarnings" label="Other earnings" value={defaults.otherEarnings} error={e.otherEarnings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Deductions"
          description="Auto-computed statutory amounts — override any of them here."
        />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <MoneyField name="sss" label="SSS" value={defaults.sss} error={e.sss} />
          <MoneyField name="philHealth" label="PhilHealth" value={defaults.philHealth} error={e.philHealth} />
          <MoneyField name="pagIbig" label="Pag-IBIG" value={defaults.pagIbig} error={e.pagIbig} />
          <MoneyField name="withholdingTax" label="Withholding tax" value={defaults.withholdingTax} error={e.withholdingTax} />
          <MoneyField name="absenceDeduction" label="Absence / LWOP" value={defaults.absenceDeduction} error={e.absenceDeduction} />
          <MoneyField name="otherDeductions" label="Other deductions" value={defaults.otherDeductions} error={e.otherDeductions} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Employer contributions"
          description="Company-paid; not deducted from net pay."
        />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <MoneyField name="sssEr" label="SSS (employer)" value={defaults.sssEr} error={e.sssEr} />
          <MoneyField name="philHealthEr" label="PhilHealth (employer)" value={defaults.philHealthEr} error={e.philHealthEr} />
          <MoneyField name="pagIbigEr" label="Pag-IBIG (employer)" value={defaults.pagIbigEr} error={e.pagIbigEr} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notes" />
        <CardBody>
          <Field label="Notes" htmlFor="notes" error={e.notes}>
            <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Save adjustments</SubmitButton>
      </div>
    </form>
  );
}
