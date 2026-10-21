"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex-config";

type CanArgs =
  | {
      domain: "users";
      action: "list" | "read" | "create" | "update" | "delete" | "changes.read";
    }
  | { domain: "profile"; action: "self.read" | "self.write" };

/**
 * `undefined` while auth, provisioning, or `can` is pending.
 * Skips `can` until `getMe` is non-null so a JWT without an App user does not throw.
 * One `can` subscription per distinct pair.
 */
export function useCan(args: CanArgs): boolean | undefined {
  const configured = isConvexConfigured();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ready = configured && !isLoading && isAuthenticated;
  const me = useQuery(api.users.getMe, ready ? {} : "skip");
  const allowed = useQuery(api.authz.can, ready && me != null ? args : "skip");
  if (!ready || me == null || allowed === undefined) {
    return undefined;
  }
  return allowed;
}
