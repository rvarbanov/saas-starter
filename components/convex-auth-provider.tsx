"use client";

import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";
import { isConvexConfigured } from "@/lib/convex-config";

function useConvexAuthFromWorkOS() {
  const { user, loading: userLoading } = useAuth();
  const { getAccessToken, loading: tokenLoading } = useAccessToken();

  const isLoading = userLoading || tokenLoading;
  const isAuthenticated = user !== null;

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken: async ({
      forceRefreshToken: _forceRefreshToken,
    }: {
      forceRefreshToken: boolean;
    }) => {
      const token = await getAccessToken();
      return token ?? null;
    },
  };
}

function ConvexAuthProviderInner({
  children,
  convexUrl,
}: {
  children: ReactNode;
  convexUrl: string;
}) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);
  return (
    <ConvexProviderWithAuth client={client} useAuth={useConvexAuthFromWorkOS}>
      {children}
    </ConvexProviderWithAuth>
  );
}

/** Skips Convex when `NEXT_PUBLIC_CONVEX_URL` is missing or still a placeholder. */
export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url || !isConvexConfigured()) {
    return <>{children}</>;
  }
  return <ConvexAuthProviderInner convexUrl={url}>{children}</ConvexAuthProviderInner>;
}
