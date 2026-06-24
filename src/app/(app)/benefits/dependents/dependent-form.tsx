"use client";

import { useActionState } from "react";
import { addDependent } from "@/lib/actions/benefits";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { DEPENDENT_RELATIONS, DEPENDENT_RELATION_LABELS } from "@/lib/constants";

export function DependentForm() {
  const [state, action] = useActionState(addDependent, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="First name" htmlFor="firstName" error={e.firstName} required>
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={e.lastName} required>
          <Input id="lastName" name="lastName" required />
        </Field>
        <Field label="Relationship" htmlFor="relation" error={e.relation} required>
          <Select id="relation" name="relation" defaultValue="SPOUSE">
            {DEPENDENT_RELATIONS.map((r) => (
              <option key={r} value={r}>
                {DEPENDENT_RELATION_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date of birth" htmlFor="dateOfBirth" error={e.dateOfBirth}>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Add dependent</SubmitButton>
      </div>
    </form>
  );
}
