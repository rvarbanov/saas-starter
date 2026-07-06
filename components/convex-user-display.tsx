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
    <p className="min-h-22 text-sm text-muted-foreground" data-testid="convex-user-loading">
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
    <div className="flex flex-col gap-2 text-muted-foreground" data-testid="convex-user-profile">
      <p>
        <span className="font-medium text-foreground">Email:</span> {user.email}
      </p>
      <p>
        <span className="font-medium text-foreground">App user id:</span>{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{user.appUserId}</code>
      </p>
      {user.name ? (
        <p>
          <span className="font-medium text-foreground">Name:</span> {user.name}
        </p>
      ) : null}
    </div>
  );
}
