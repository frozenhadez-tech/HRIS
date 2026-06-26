import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthCard, AuthBrand } from "../auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in with a real account? Skip the form.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthCard>
      <AuthBrand />
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Login</h1>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-white/75">
        Don&apos;t have an organization?{" "}
        <Link
          href="/signup"
          className="font-semibold text-white underline-offset-4 hover:underline"
        >
          Register for free
        </Link>
      </p>
    </AuthCard>
  );
}
