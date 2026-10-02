"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useAction, useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex-config";
import { hasProvisionedThisSignIn, markProvisionedThisSignIn } from "@/lib/provisioned-sign-in";

/**
 * Upsert the authenticated WorkOS user into Convex once per sign-in.
 * Uses `usersActions.provisionUser` so email can be loaded from WorkOS when absent from the JWT.
 * A successful call is remembered for the WorkOS session so later full page loads skip it.
 */
export function useStoreUser(): void {
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { sessionId, loading: workOsLoading } = useAuth();
  const storeUser = useAction(api.usersActions.provisionUser);
  const provisionedRef = useRef(false);
  const provisioningRef = useRef(false);

  useEffect(() => {
    if (!isConvexConfigured()) {
      return;
    }

    if (!isAuthenticated) {
      provisionedRef.current = false;
      provisioningRef.current = false;
      return;
    }

    if (workOsLoading || convexAuthLoading || provisionedRef.current || provisioningRef.current) {
      return;
    }

    if (sessionId && hasProvisionedThisSignIn(sessionId)) {
      provisionedRef.current = true;
      return;
    }

    let cancelled = false;
    provisioningRef.current = true;

    void storeUser({})
      .then(() => {
        if (sessionId) {
          markProvisionedThisSignIn(sessionId);
        }
        if (!cancelled) {
          provisionedRef.current = true;
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to provision Convex user", error);
      })
      .finally(() => {
        provisioningRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [convexAuthLoading, isAuthenticated, sessionId, storeUser, workOsLoading]);
}
