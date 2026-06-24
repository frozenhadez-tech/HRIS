"use client";

import { useActionState } from "react";
import { createShift } from "@/lib/actions/scheduling";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

const COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#a855f7", label: "Purple" },
  { value: "#64748b", label: "Slate" },
];

export function ShiftForm() {
  const [state, action] = useActionState(createShift, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" htmlFor="name" error={e.name} required>
          <Input id="name" name="name" placeholder="Morning" required />
        </Field>
        <Field label="Start" htmlFor="startTime" error={e.startTime} required>
          <Input id="startTime" name="startTime" type="time" defaultValue="09:00" required />
        </Field>
        <Field label="End" htmlFor="endTime" error={e.endTime} required>
          <Input id="endTime" name="endTime" type="time" defaultValue="17:00" required />
        </Field>
        <Field label="Color" htmlFor="colorHex" error={e.colorHex}>
          <Select id="colorHex" name="colorHex" defaultValue="#6366f1">
            {COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Add shift</SubmitButton>
      </div>
    </form>
  );
}
