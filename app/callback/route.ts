import { CallbackError, handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { APP_ROUTES } from "@/lib/app-routes";

export const GET = handleAuth({
  returnPathname: APP_ROUTES.dashboard,
  onError: ({ error, request }) => {
    const code = error instanceof CallbackError ? error.code : "unknown";
    console.error("[AuthKit callback error]", { code, error });

    const url = new URL("/sign-in", request.url);
    url.searchParams.set("error", "callback");
    if (code !== "unknown") {
      url.searchParams.set("code", code);
    }
    return NextResponse.redirect(url);
  },
});
