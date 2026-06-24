"use client";

import { useActionState } from "react";
import { assignShift } from "@/lib/actions/scheduling";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function AssignForm({
  employees,
  shifts,
}: {
  employees: { id: string; firstName: string; lastName: string }[];
  shifts: { id: string; name: string; startTime: string; endTime: string }[];
}) {
  const [state, action] = useActionState(assignShift, emptyState);
  const e = state.fieldErrors ?? {};

  if (shifts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Create a shift first, then you can assign it to employees.
      </p>
    );
  }

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
        <Field label="Shift" htmlFor="shiftId" error={e.shiftId} required>
          <Select id="shiftId" name="shiftId" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="date" error={e.date} required>
          <Input id="date" name="date" type="date" required />
        </Field>
        <Field label="Note" htmlFor="note" error={e.note}>
          <Input id="note" name="note" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Assign shift</SubmitButton>
      </div>
    </form>
  );
}
