"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { emptyState } from "@/lib/actions/state";
import {
  AuthField,
  AuthError,
  AuthSubmit,
  PasswordInput,
  authInputClass,
} from "../auth-ui";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, emptyState);

  return (
    <form action={action} className="space-y-5">
      {state.error && <AuthError>{state.error}</AuthError>}
      <AuthField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="username@gmail.com"
          required
          className={authInputClass}
        />
      </AuthField>
      <AuthField
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          required
        />
      </AuthField>
      <AuthSubmit pendingText="Signing in…">Sign in</AuthSubmit>
    </form>
  );
}
