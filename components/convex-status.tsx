"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex-config";

/** Shows Convex query result on the landing page when a real deployment URL is set. */
export function ConvexStatus() {
  if (!isConvexConfigured()) {
    return (
      <p className="text-caption" data-testid="convex-status-unconfigured">
        Convex: set <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env</code> after{" "}
        <code>npx convex dev</code> (see dashboard URL).
      </p>
    );
  }
  return <ConvexStatusConnected />;
}

function ConvexStatusConnected() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const message = useQuery(api.ping.getMessage, mounted ? {} : "skip");

  if (!mounted || message === undefined) {
    return (
      <p className="text-caption" data-testid="convex-status-loading">
        Loading Convex…
      </p>
    );
  }

  return (
    <p className="text-caption" data-testid="convex-status">
      {message.message}
    </p>
  );
}
