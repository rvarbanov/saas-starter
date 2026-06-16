import { type NextRequest, NextResponse } from "next/server";

/** Legacy entry — delegate to /dashboard so authkitProxy owns the OAuth/PKCE redirect. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
