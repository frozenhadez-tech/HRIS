"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { LeaveRequest } from "@prisma/client";
import { emptyState, type ActionState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { toDateInput } from "@/lib/utils";

type Action = (
  prevState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function LeaveRequestForm({
  action,
  leaveTypes,
  defaults,
  submitLabel = "Submit request",
}: {
  action: Action;
  leaveTypes: { id: string; name: string; paid: boolean }[];
  defaults?: Pick<
    LeaveRequest,
    "leaveTypeId" | "startDate" | "endDate" | "halfDay" | "reason"
  > | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Request details" />
        <CardBody className="space-y-4">
          <Field label="Leave type" htmlFor="leaveTypeId" error={e.leaveTypeId} required>
            <Select
              id="leaveTypeId"
              name="leaveTypeId"
              defaultValue={defaults?.leaveTypeId ?? ""}
            >
              <option value="" disabled>
                Select a type…
              </option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.paid ? "" : "(unpaid)"}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="startDate" error={e.startDate} required>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={toDateInput(defaults?.startDate)}
                required
              />
            </Field>
            <Field label="End date" htmlFor="endDate" error={e.endDate} required>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={toDateInput(defaults?.endDate)}
                required
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="halfDay"
              defaultChecked={defaults?.halfDay ?? false}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Half day (counts as 0.5 — only for a single-day request)
          </label>
          <Field
            label="Reason"
            htmlFor="reason"
            error={e.reason}
            hint="Optional — give your approver context."
          >
            <Textarea id="reason" name="reason" defaultValue={defaults?.reason ?? ""} />
          </Field>
          <p className="text-xs text-slate-500">
            Leave is counted in working days (Mon–Fri), excluding company
            holidays. Your request goes to your manager for approval.
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/leave">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
