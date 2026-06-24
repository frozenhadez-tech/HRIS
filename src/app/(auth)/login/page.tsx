import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in with a real account? Skip the form.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to your HRIS account.
        </p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an organization yet?{" "}
        <Link
          href="/signup"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Create one
        </Link>
      </p>
    </Card>
  );
}
