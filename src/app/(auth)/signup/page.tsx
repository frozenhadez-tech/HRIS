import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Create your organization
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ll be set up as the organization admin.
        </p>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
