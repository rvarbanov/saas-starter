import { type NextRequest, NextResponse } from "next/server";
import { APP_ROUTES } from "@/lib/app-routes";

/** Legacy entry — delegate to the dashboard so authkitProxy owns the OAuth/PKCE redirect. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL(APP_ROUTES.dashboard, request.url));
}
