"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Department } from "@prisma/client";
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

export function DepartmentForm({
  action,
  defaults,
  parents,
  employees,
  submitLabel = "Save department",
  cancelHref,
}: {
  action: Action;
  defaults?: Department | null;
  parents: { id: string; name: string }[];
  employees: { id: string; firstName: string; lastName: string }[];
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Department details" />
        <CardBody className="space-y-4">
          <Field label="Name" htmlFor="name" error={e.name} required>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} required />
          </Field>
          <Field label="Description" htmlFor="description" error={e.description}>
            <Textarea
              id="description"
              name="description"
              defaultValue={defaults?.description ?? ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parent department" htmlFor="parentId" error={e.parentId}>
              <Select id="parentId" name="parentId" defaultValue={defaults?.parentId ?? ""}>
                <option value="">— None (top level) —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Department head" htmlFor="headId" error={e.headId}>
              <Select id="headId" name="headId" defaultValue={defaults?.headId ?? ""}>
                <option value="">— None —</option>
                {employees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={cancelHref}>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
