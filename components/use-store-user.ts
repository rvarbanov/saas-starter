"use client";

import { useAction, useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex-config";

/**
 * Upsert the authenticated WorkOS user into Convex after sign-in.
 * Uses `usersActions.provisionUser` so email can be loaded from WorkOS when absent from the JWT.
 */
export function useStoreUser(): void {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
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

    if (authLoading || provisionedRef.current || provisioningRef.current) {
      return;
    }

    let cancelled = false;
    provisioningRef.current = true;

    void storeUser({})
      .then(() => {
        if (!cancelled) {
          provisionedRef.current = true;
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          provisioningRef.current = false;
        }
        console.error("Failed to provision Convex user", error);
      })
      .finally(() => {
        provisioningRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, storeUser]);
}
