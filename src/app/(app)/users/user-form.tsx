"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createUser } from "@/lib/actions/users";
import { emptyState } from "@/lib/actions/state";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/auth/rbac";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export function UserForm({
  employees,
}: {
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  const [state, action] = useActionState(createUser, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card>
        <CardHeader title="Account" />
        <CardBody className="space-y-4">
          <Field label="Email" htmlFor="email" error={e.email} required>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="password"
            error={e.password}
            hint="At least 8 characters. Share it securely with the user."
            required
          >
            <Input id="password" name="password" type="password" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" htmlFor="role" error={e.role} required>
              <Select id="role" name="role" defaultValue="EMPLOYEE">
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Link to employee"
              htmlFor="employeeId"
              error={e.employeeId}
              hint="Optional — connect this login to an employee record."
            >
              <Select id="employeeId" name="employeeId" defaultValue="">
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
        <Link href="/users">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <SubmitButton>Create user</SubmitButton>
      </div>
    </form>
  );
}
