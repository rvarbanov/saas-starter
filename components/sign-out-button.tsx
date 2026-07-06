"use client";

import { isConvexConfigured } from "@/lib/convex-config";
import { closeConvexClient } from "@/lib/convex-client";

const signOutButtonClassName =
  "text-sm font-medium text-primary underline-offset-4 hover:underline";

function SignOutButtonFallback() {
  return (
    <form action="/sign-out" method="GET">
      <button className={signOutButtonClassName} type="submit">
        Sign out
      </button>
    </form>
  );
}

function SignOutButtonWithConvex() {
  const handleSignOut = () => {
    window.addEventListener(
      "pagehide",
      () => {
        closeConvexClient();
      },
      { once: true },
    );
    window.location.assign("/sign-out");
  };

  return (
    <button className={signOutButtonClassName} type="button" onClick={handleSignOut}>
      Sign out
    </button>
  );
}

/** WorkOS sign-out via GET route; closes Convex before navigation when configured. */
export function SignOutButton() {
  if (!isConvexConfigured()) {
    return <SignOutButtonFallback />;
  }
  return <SignOutButtonWithConvex />;
}
