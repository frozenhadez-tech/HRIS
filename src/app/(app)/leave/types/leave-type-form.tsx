"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { LeaveType } from "@prisma/client";
import { emptyState, type ActionState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

type Action = (
  prevState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

const COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#a855f7", label: "Purple" },
  { value: "#64748b", label: "Slate" },
];

export function LeaveTypeForm({
  action,
  defaults,
  submitLabel = "Save leave type",
}: {
  action: Action;
  defaults?: LeaveType | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Leave type" />
        <CardBody className="space-y-4">
          <Field label="Name" htmlFor="name" error={e.name} required>
            <Input
              id="name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              placeholder="e.g. Vacation"
              required
            />
          </Field>
          <Field label="Description" htmlFor="description" error={e.description}>
            <Textarea
              id="description"
              name="description"
              defaultValue={defaults?.description ?? ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Default annual allocation (days)"
              htmlFor="defaultAllocationDays"
              error={e.defaultAllocationDays}
            >
              <Input
                id="defaultAllocationDays"
                name="defaultAllocationDays"
                type="number"
                min={0}
                max={365}
                defaultValue={defaults?.defaultAllocationDays ?? 0}
              />
            </Field>
            <Field label="Accent color" htmlFor="colorHex" error={e.colorHex}>
              <Select
                id="colorHex"
                name="colorHex"
                defaultValue={defaults?.colorHex ?? "#6366f1"}
              >
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="paid"
              defaultChecked={defaults?.paid ?? true}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Paid leave (counts against a balance)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults?.isActive ?? true}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active (available for new requests)
          </label>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/leave/types">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
