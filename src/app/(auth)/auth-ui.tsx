"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Glass-theme form primitives shared by the login + signup forms.

export const authInputClass =
  "w-full rounded-lg border border-white/50 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-white focus:bg-white focus:ring-2 focus:ring-white/70";

export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | string[];
  hint?: string;
  children: ReactNode;
}) {
  const errorText = Array.isArray(error) ? error[0] : error;
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {hint && !errorText && <p className="text-xs text-white/65">{hint}</p>}
      {errorText && (
        <p className="text-xs font-medium text-rose-100">{errorText}</p>
      )}
    </div>
  );
}

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={cn(authInputClass, "pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 transition hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-rose-200/40 bg-rose-500/25 px-3 py-2 text-sm text-white">
      {children}
    </div>
  );
}

export function AuthSubmit({
  children,
  pendingText,
}: {
  children: ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0b1f3a]/40 transition hover:bg-[#12305a] focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingText : children}
    </button>
  );
}
