import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isAuthPage = AUTH_PATHS.includes(pathname);

  // Everything that isn't an auth page requires a (cryptographically) valid
  // session token. We do NOT bounce signed-in users away from /login here: the
  // token can be valid yet reference a user that no longer exists (e.g. after a
  // db re-seed). The login/signup pages do a DB-backed check and redirect real
  // users to the dashboard — keeping that decision out of the edge proxy avoids
  // a redirect loop between the proxy and the page guards.
  if (!session && !isAuthPage) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
