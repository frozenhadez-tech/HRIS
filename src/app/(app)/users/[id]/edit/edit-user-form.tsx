"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { UserRole, UserStatus } from "@prisma/client";
import { updateUser } from "@/lib/actions/users";
import { emptyState } from "@/lib/actions/state";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/auth/rbac";
import { USER_STATUS_LABELS } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

const STATUSES: UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED"];

export function EditUserForm({
  id,
  email,
  role,
  status,
  isSelf,
}: {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateUser.bind(null, id), emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {isSelf && (
        <Alert tone="info">
          This is your own account — you can&apos;t change your own role or
          status.
        </Alert>
      )}
      <Card>
        <CardHeader title={email} description="Update role and status." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="role" error={e.role} required>
            <Select
              id="role"
              name="role"
              defaultValue={role === "SUPER_ADMIN" ? "ORG_ADMIN" : role}
              disabled={isSelf}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status" error={e.status} required>
            <Select
              id="status"
              name="status"
              defaultValue={status}
              disabled={isSelf}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {USER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/users">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        {!isSelf && <SubmitButton>Save changes</SubmitButton>}
      </div>
    </form>
  );
}
