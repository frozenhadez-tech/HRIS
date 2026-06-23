import { redirect } from "next/navigation";

// Middleware sends unauthenticated visitors to /login, so reaching the root
// means we have a session — go straight to the dashboard.
export default function RootPage() {
  redirect("/dashboard");
}
