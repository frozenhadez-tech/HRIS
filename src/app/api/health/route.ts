import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public health/keep-warm endpoint. Point an external uptime pinger at
// /api/health every ~4 minutes to keep the Neon compute from auto-suspending
// (free tier scales to zero after ~5 min idle). Runs a trivial query so the DB
// connection stays warm. No auth required (allow-listed in src/proxy.ts).
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - startedAt });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
