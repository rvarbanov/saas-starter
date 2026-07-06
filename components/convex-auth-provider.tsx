"use client";

import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth } from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";
import { ConvexUserSync } from "@/components/convex-user-sync";
import { getConvexClient } from "@/lib/convex-client";
import { isConvexConfigured } from "@/lib/convex-config";

function useConvexAuthFromWorkOS() {
  const { user, loading: userLoading } = useAuth();
  const { getAccessToken, loading: tokenLoading } = useAccessToken();
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const isLoading = userLoading || tokenLoading;
  const isAuthenticated = user !== null;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken: _forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = await getAccessTokenRef.current();
        return token ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [fetchAccessToken, isAuthenticated, isLoading],
  );
}

function ConvexAuthProviderInner({ children }: { children: ReactNode }) {
  const client = getConvexClient();
  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={client} useAuth={useConvexAuthFromWorkOS}>
      <ConvexUserSync>{children}</ConvexUserSync>
    </ConvexProviderWithAuth>
  );
}

/** Skips Convex when `NEXT_PUBLIC_CONVEX_URL` is missing or still a placeholder. */
export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  if (!isConvexConfigured()) {
    return <>{children}</>;
  }
  return <ConvexAuthProviderInner>{children}</ConvexAuthProviderInner>;
}
