"use client";

import { useActionState } from "react";
import { signupAction } from "@/lib/actions/auth";
import { emptyState } from "@/lib/actions/state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, emptyState);

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Company name"
        htmlFor="organizationName"
        error={state.fieldErrors?.organizationName}
        required
      >
        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Acme Inc."
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          htmlFor="firstName"
          error={state.fieldErrors?.firstName}
          required
        >
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field
          label="Last name"
          htmlFor="lastName"
          error={state.fieldErrors?.lastName}
          required
        >
          <Input id="lastName" name="lastName" required />
        </Field>
      </div>
      <Field
        label="Work email"
        htmlFor="email"
        error={state.fieldErrors?.email}
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint="At least 8 characters."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create organization
      </SubmitButton>
    </form>
  );
}
