import { NextResponse } from "next/server";

/** Lightweight readiness probe for Playwright E2E (no auth, no Convex). */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
