"use client";

import { useActionState } from "react";
import { createHoliday } from "@/lib/actions/leave";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function HolidayForm() {
  const [state, action] = useActionState(createHoliday, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Holiday name" htmlFor="name" error={e.name} required>
          <Input id="name" name="name" placeholder="e.g. Independence Day" required />
        </Field>
        <Field label="Date" htmlFor="date" error={e.date} required>
          <Input id="date" name="date" type="date" required />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Add holiday</SubmitButton>
      </div>
    </form>
  );
}
