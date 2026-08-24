"use client";

import { closeConvexClient } from "@/lib/convex-client";
import { isConvexConfigured } from "@/lib/convex-config";

/** WorkOS sign-out via GET route; closes Convex before navigation when configured. */
export function signOutFromApp(): void {
  if (isConvexConfigured()) {
    window.addEventListener(
      "pagehide",
      () => {
        closeConvexClient();
      },
      { once: true },
    );
  }
  window.location.assign("/sign-out");
}
