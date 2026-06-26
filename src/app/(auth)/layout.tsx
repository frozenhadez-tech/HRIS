import type { ReactNode } from "react";
import { AuthBackdrop } from "./auth-backdrop";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md">
        {children}
        <p className="mt-6 text-center text-xs text-white/65">
          Human Resources Information System
        </p>
      </div>
    </div>
  );
}
