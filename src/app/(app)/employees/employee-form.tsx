"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Employee } from "@prisma/client";
import { emptyState, type ActionState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import {
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/constants";
import { toDateInput } from "@/lib/utils";

type Action = (
  prevState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function EmployeeForm({
  action,
  defaults,
  suggestedEmployeeNumber,
  departments,
  managers,
  submitLabel = "Save employee",
  cancelHref,
}: {
  action: Action;
  defaults?: Employee | null;
  suggestedEmployeeNumber?: string;
  departments: { id: string; name: string }[];
  managers: { id: string; firstName: string; lastName: string }[];
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Card>
        <CardHeader title="Personal information" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee number" htmlFor="employeeNumber" error={e.employeeNumber} required>
            <Input
              id="employeeNumber"
              name="employeeNumber"
              defaultValue={defaults?.employeeNumber ?? suggestedEmployeeNumber ?? ""}
              required
            />
          </Field>
          <Field label="Email" htmlFor="email" error={e.email} required>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults?.email ?? ""}
              required
            />
          </Field>
          <Field label="First name" htmlFor="firstName" error={e.firstName} required>
            <Input id="firstName" name="firstName" defaultValue={defaults?.firstName ?? ""} required />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={e.lastName} required>
            <Input id="lastName" name="lastName" defaultValue={defaults?.lastName ?? ""} required />
          </Field>
          <Field label="Phone" htmlFor="phone" error={e.phone}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} />
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth" error={e.dateOfBirth}>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={toDateInput(defaults?.dateOfBirth)} />
          </Field>
          <Field label="Gender" htmlFor="gender" error={e.gender}>
            <Select id="gender" name="gender" defaultValue={defaults?.gender ?? ""}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Employment" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" htmlFor="jobTitle" error={e.jobTitle}>
            <Input id="jobTitle" name="jobTitle" defaultValue={defaults?.jobTitle ?? ""} />
          </Field>
          <Field label="Employment type" htmlFor="employmentType" error={e.employmentType}>
            <Select id="employmentType" name="employmentType" defaultValue={defaults?.employmentType ?? "FULL_TIME"}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status" error={e.status}>
            <Select id="status" name="status" defaultValue={defaults?.status ?? "ACTIVE"}>
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMPLOYEE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" htmlFor="departmentId" error={e.departmentId}>
            <Select id="departmentId" name="departmentId" defaultValue={defaults?.departmentId ?? ""}>
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reports to (manager)" htmlFor="managerId" error={e.managerId}>
            <Select id="managerId" name="managerId" defaultValue={defaults?.managerId ?? ""}>
              <option value="">— None —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hire date" htmlFor="hireDate" error={e.hireDate}>
            <Input id="hireDate" name="hireDate" type="date" defaultValue={toDateInput(defaults?.hireDate)} />
          </Field>
          <Field label="Termination date" htmlFor="terminationDate" error={e.terminationDate}>
            <Input id="terminationDate" name="terminationDate" type="date" defaultValue={toDateInput(defaults?.terminationDate)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" htmlFor="addressLine1" error={e.addressLine1}>
            <Input id="addressLine1" name="addressLine1" defaultValue={defaults?.addressLine1 ?? ""} />
          </Field>
          <Field label="Address line 2" htmlFor="addressLine2" error={e.addressLine2}>
            <Input id="addressLine2" name="addressLine2" defaultValue={defaults?.addressLine2 ?? ""} />
          </Field>
          <Field label="City" htmlFor="city" error={e.city}>
            <Input id="city" name="city" defaultValue={defaults?.city ?? ""} />
          </Field>
          <Field label="State / Province" htmlFor="state" error={e.state}>
            <Input id="state" name="state" defaultValue={defaults?.state ?? ""} />
          </Field>
          <Field label="Postal code" htmlFor="postalCode" error={e.postalCode}>
            <Input id="postalCode" name="postalCode" defaultValue={defaults?.postalCode ?? ""} />
          </Field>
          <Field label="Country" htmlFor="country" error={e.country}>
            <Input id="country" name="country" defaultValue={defaults?.country ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Emergency contact" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" htmlFor="emergencyContactName" error={e.emergencyContactName}>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={defaults?.emergencyContactName ?? ""} />
          </Field>
          <Field label="Contact phone" htmlFor="emergencyContactPhone" error={e.emergencyContactPhone}>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={defaults?.emergencyContactPhone ?? ""} />
          </Field>
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
