"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { BenefitPlan } from "@prisma/client";
import { emptyState, type ActionState } from "@/lib/actions/state";
import { BENEFIT_TYPES, BENEFIT_TYPE_LABELS } from "@/lib/constants";
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

export function PlanForm({
  action,
  defaults,
  submitLabel = "Save plan",
}: {
  action: Action;
  defaults?: BenefitPlan | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Plan details" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="type" error={e.type} required>
              <Select id="type" name="type" defaultValue={defaults?.type ?? "HEALTH"}>
                {BENEFIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BENEFIT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" htmlFor="name" error={e.name} required>
              <Input id="name" name="name" defaultValue={defaults?.name ?? ""} placeholder="e.g. Maxicare Plan A" required />
            </Field>
            <Field label="Provider" htmlFor="provider" error={e.provider}>
              <Input id="provider" name="provider" defaultValue={defaults?.provider ?? ""} placeholder="e.g. Maxicare" />
            </Field>
            <Field label="Coverage amount" htmlFor="coverageAmount" error={e.coverageAmount} hint="e.g. HMO max benefit limit or life sum assured.">
              <Input id="coverageAmount" name="coverageAmount" type="number" min={0} step="0.01" defaultValue={defaults?.coverageAmount ?? ""} />
            </Field>
            <Field label="Employee contribution / mo" htmlFor="employeeContribution" error={e.employeeContribution}>
              <Input id="employeeContribution" name="employeeContribution" type="number" min={0} step="0.01" defaultValue={defaults?.employeeContribution ?? 0} />
            </Field>
            <Field label="Employer contribution / mo" htmlFor="employerContribution" error={e.employerContribution}>
              <Input id="employerContribution" name="employerContribution" type="number" min={0} step="0.01" defaultValue={defaults?.employerContribution ?? 0} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={e.description}>
            <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults?.isActive ?? true}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active (available for enrollment)
          </label>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/benefits/plans">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
