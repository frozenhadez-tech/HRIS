"use client";

import { useActionState } from "react";
import { signupAction } from "@/lib/actions/auth";
import { emptyState } from "@/lib/actions/state";
import {
  AuthField,
  AuthError,
  AuthSubmit,
  PasswordInput,
  authInputClass,
} from "../auth-ui";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, emptyState);

  return (
    <form action={action} className="space-y-4">
      {state.error && <AuthError>{state.error}</AuthError>}
      <AuthField
        label="Company name"
        htmlFor="organizationName"
        error={state.fieldErrors?.organizationName}
      >
        <input
          id="organizationName"
          name="organizationName"
          placeholder="Acme Inc."
          required
          className={authInputClass}
        />
      </AuthField>
      <div className="grid grid-cols-2 gap-3">
        <AuthField
          label="First name"
          htmlFor="firstName"
          error={state.fieldErrors?.firstName}
        >
          <input
            id="firstName"
            name="firstName"
            required
            className={authInputClass}
          />
        </AuthField>
        <AuthField
          label="Last name"
          htmlFor="lastName"
          error={state.fieldErrors?.lastName}
        >
          <input
            id="lastName"
            name="lastName"
            required
            className={authInputClass}
          />
        </AuthField>
      </div>
      <AuthField
        label="Work email"
        htmlFor="email"
        error={state.fieldErrors?.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          className={authInputClass}
        />
      </AuthField>
      <AuthField
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint="At least 8 characters."
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
      </AuthField>
      <AuthField
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
      </AuthField>
      <AuthSubmit pendingText="Creating account…">
        Create organization
      </AuthSubmit>
    </form>
  );
}
