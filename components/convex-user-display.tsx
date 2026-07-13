"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex-config";

/** Displays the authenticated user's Convex record (email + portable appUserId). */
export function ConvexUserDisplay() {
  if (!isConvexConfigured()) {
    return null;
  }

  return <ConvexUserDisplayInner />;
}

function ConvexUserProfileSkeleton() {
  return (
    <p className="text-loading" data-testid="convex-user-loading">
      Loading Convex user…
    </p>
  );
}

function ConvexUserDisplayInner() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const user = useQuery(api.users.getMe, ready ? {} : "skip");

  if (!ready || user === undefined || user === null) {
    return <ConvexUserProfileSkeleton />;
  }

  return (
    <div className="stack-sm text-body" data-testid="convex-user-profile">
      <p>
        <span className="text-emphasis">Email:</span> {user.email}
      </p>
      <p>
        <span className="text-emphasis">App user id:</span>{" "}
        <code className="inline-code">{user.appUserId}</code>
      </p>
      {user.name ? (
        <p>
          <span className="text-emphasis">Name:</span> {user.name}
        </p>
      ) : null}
    </div>
  );
}
