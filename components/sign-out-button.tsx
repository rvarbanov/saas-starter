"use client";

import { isConvexConfigured } from "@/lib/convex-config";
import { closeConvexClient } from "@/lib/convex-client";

function SignOutButtonFallback() {
  return (
    <form action="/sign-out" method="GET">
      <button className="link-primary" type="submit">
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
    <button className="link-primary" type="button" onClick={handleSignOut}>
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
