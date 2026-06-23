import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

// Edge-safe session token utilities (no next/headers, no Prisma runtime import).
// Safe to import from middleware as well as server components.

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
}

const ALG = "HS256";
export const SESSION_COOKIE = "hris_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET environment variable is missing or too short (need >= 16 chars).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.userId || !payload.organizationId) return null;
    return {
      userId: payload.userId as string,
      organizationId: payload.organizationId as string,
      role: payload.role as UserRole,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
