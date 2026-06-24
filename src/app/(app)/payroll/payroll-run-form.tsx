"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPayrollRun } from "@/lib/actions/payroll";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

const FREQ = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "SEMI_MONTHLY", label: "Semi-monthly" },
  { value: "DAILY", label: "Daily" },
];

export function PayrollRunForm() {
  const [state, action] = useActionState(createPayrollRun, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader
          title="New payroll run"
          description="Generates draft payslips for every active employee with a monthly salary."
        />
        <CardBody className="space-y-4">
          <Field label="Label" htmlFor="label" error={e.label} required>
            <Input id="label" name="label" placeholder="e.g. June 2026" required />
          </Field>
          <Field label="Frequency" htmlFor="frequency" error={e.frequency} required>
            <Select id="frequency" name="frequency" defaultValue="MONTHLY">
              {FREQ.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Period start" htmlFor="periodStart" error={e.periodStart} required>
              <Input id="periodStart" name="periodStart" type="date" required />
            </Field>
            <Field label="Period end" htmlFor="periodEnd" error={e.periodEnd} required>
              <Input id="periodEnd" name="periodEnd" type="date" required />
            </Field>
            <Field label="Pay date" htmlFor="payDate" error={e.payDate} required>
              <Input id="payDate" name="payDate" type="date" required />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Overtime, absences, and unpaid leave are pulled from attendance for
            the period. SSS, PhilHealth, Pag-IBIG, and withholding tax are
            auto-computed. You can adjust each payslip before finalizing.
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/payroll">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingText="Generating…">Generate payroll</SubmitButton>
      </div>
    </form>
  );
}
