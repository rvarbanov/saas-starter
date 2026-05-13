import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

/** Starts the AuthKit OAuth/PKCE flow (hosted UI supports email + password when enabled in WorkOS). */
export async function GET() {
  const url = await getSignInUrl({ returnTo: "/dashboard" });
  // Use NextResponse.redirect in Route Handlers — not `redirect()` from `next/navigation` (throw-based; can flash in dev).
  return NextResponse.redirect(url);
}
