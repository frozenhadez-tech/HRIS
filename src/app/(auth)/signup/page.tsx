import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthCard, AuthBrand } from "../auth-shell";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  // Already signed in with a real account? Skip the form.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthCard>
      <AuthBrand />
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        Create account
      </h1>
      <p className="mt-1 text-sm text-white/75">
        You&apos;ll be set up as the organization admin.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-white/75">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-white underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
