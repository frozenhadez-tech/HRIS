"use client";

import { useActionState } from "react";
import { updatePayslip } from "@/lib/actions/payroll";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function PayslipEditForm({
  payslipId,
  defaults,
}: {
  payslipId: string;
  defaults: {
    allowance: number;
    overtimeHours: number;
    otherEarnings: number;
    otherDeductions: number;
    notes: string | null;
  };
}) {
  const [state, action] = useActionState(
    updatePayslip.bind(null, payslipId),
    emptyState,
  );
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Allowance" htmlFor="allowance" error={e.allowance}>
          <Input id="allowance" name="allowance" type="number" min={0} step="0.01" defaultValue={defaults.allowance} />
        </Field>
        <Field label="Overtime hours" htmlFor="overtimeHours" error={e.overtimeHours}>
          <Input id="overtimeHours" name="overtimeHours" type="number" min={0} step="0.5" defaultValue={defaults.overtimeHours} />
        </Field>
        <Field label="Other earnings" htmlFor="otherEarnings" error={e.otherEarnings}>
          <Input id="otherEarnings" name="otherEarnings" type="number" min={0} step="0.01" defaultValue={defaults.otherEarnings} />
        </Field>
        <Field label="Other deductions" htmlFor="otherDeductions" error={e.otherDeductions}>
          <Input id="otherDeductions" name="otherDeductions" type="number" min={0} step="0.01" defaultValue={defaults.otherDeductions} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" error={e.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>Save adjustments</SubmitButton>
      </div>
    </form>
  );
}
