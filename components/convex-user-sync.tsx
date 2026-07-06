"use client";

import type { ReactNode } from "react";
import { useStoreUser } from "@/components/use-store-user";

/** Runs post-login Convex user provisioning for the authenticated subtree. */
export function ConvexUserSync({ children }: { children: ReactNode }) {
  useStoreUser();
  return <>{children}</>;
}
