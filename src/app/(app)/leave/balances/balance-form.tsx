"use client";

import { useActionState } from "react";
import { setLeaveBalance } from "@/lib/actions/leave";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function BalanceForm({
  employees,
  leaveTypes,
  year,
}: {
  employees: { id: string; firstName: string; lastName: string }[];
  leaveTypes: { id: string; name: string }[];
  year: number;
}) {
  const [state, action] = useActionState(setLeaveBalance, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Employee" htmlFor="employeeId" error={e.employeeId} required>
          <Select id="employeeId" name="employeeId" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {employees.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Leave type" htmlFor="leaveTypeId" error={e.leaveTypeId} required>
          <Select id="leaveTypeId" name="leaveTypeId" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year" htmlFor="year" error={e.year}>
          <Input id="year" name="year" type="number" defaultValue={year} />
        </Field>
        <Field
          label="Allocated days"
          htmlFor="allocatedDays"
          error={e.allocatedDays}
        >
          <Input
            id="allocatedDays"
            name="allocatedDays"
            type="number"
            min={0}
            max={365}
            defaultValue={0}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Set allocation</SubmitButton>
      </div>
    </form>
  );
}
