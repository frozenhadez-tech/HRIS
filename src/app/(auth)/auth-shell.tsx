import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Frosted-glass card used by the login + signup pages. */
export function AuthCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "auth-rise relative w-full overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-7 shadow-[0_10px_50px_-12px_rgba(6,18,46,0.6)] backdrop-blur-2xl sm:p-8",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      {children}
    </div>
  );
}

/** Small brand lockup (replaces the "Your logo" placeholder). */
export function AuthBrand() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-xs font-bold tracking-wide text-white ring-1 ring-inset ring-white/30">
        HR
      </span>
      <span className="text-sm font-medium text-white/90">HRIS</span>
    </div>
  );
}
