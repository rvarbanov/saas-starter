"use client";

import { useConvexAuth } from "convex/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UnauthorizedEmpty } from "@/components/unauthorized-empty";
import { useCan } from "@/components/use-can";
import { isConvexConfigured } from "@/lib/convex-config";
import { usersRouteAction } from "@/lib/users-route-action";

/** Holds Users page bodies until `can` for that route is true. */
export function UsersAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const action = usersRouteAction(pathname);
  const configured = isConvexConfigured();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const allowed = useCan(action);

  if (!configured) {
    return children;
  }

  const pending = isLoading || !isAuthenticated || allowed === undefined;
  if (pending) {
    return (
      <div className="content-area" data-testid="users-access-pending">
        <Skeleton className="h-8 w-48" />
        <p className="text-loading">Loading…</p>
      </div>
    );
  }

  if (!allowed) {
    return <UnauthorizedEmpty />;
  }

  return children;
}
