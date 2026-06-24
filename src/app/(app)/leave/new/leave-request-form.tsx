"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLeaveRequest } from "@/lib/actions/leave";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export function LeaveRequestForm({
  leaveTypes,
}: {
  leaveTypes: { id: string; name: string; paid: boolean }[];
}) {
  const [state, action] = useActionState(createLeaveRequest, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Request details" />
        <CardBody className="space-y-4">
          <Field label="Leave type" htmlFor="leaveTypeId" error={e.leaveTypeId} required>
            <Select id="leaveTypeId" name="leaveTypeId" defaultValue="">
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
              <Input id="startDate" name="startDate" type="date" required />
            </Field>
            <Field label="End date" htmlFor="endDate" error={e.endDate} required>
              <Input id="endDate" name="endDate" type="date" required />
            </Field>
          </div>
          <Field
            label="Reason"
            htmlFor="reason"
            error={e.reason}
            hint="Optional — give your approver context."
          >
            <Textarea id="reason" name="reason" />
          </Field>
          <p className="text-xs text-slate-500">
            Leave is counted in working days (Mon–Fri). Your request goes to your
            manager for approval.
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/leave">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton pendingText="Submitting…">Submit request</SubmitButton>
      </div>
    </form>
  );
}
