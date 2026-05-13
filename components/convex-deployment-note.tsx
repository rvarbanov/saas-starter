/**
 * Server-only hint — avoids client useQuery against a mismatched Convex deployment.
 * Align `NEXT_PUBLIC_CONVEX_URL` with the project `pnpm convex:dev` pushes to (dashboard → Deployments).
 */
export function ConvexDeploymentNote() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url || /placeholder/i.test(url)) {
    return (
      <p className="text-sm text-muted-foreground">
        Convex: set{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_CONVEX_URL</code> in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> to your deployment URL
        from the Convex dashboard.
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Convex backend <code className="rounded bg-muted px-1 py-0.5 text-xs">{url}</code>: run{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm convex:dev</code> so this repo
      pushes functions to <strong>that same</strong> deployment (URLs must match). In the Convex
      dashboard → Environment Variables for that deployment, set{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs">WORKOS_CLIENT_ID</code> (same value as{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>) so JWT identities resolve
      for queries.
    </p>
  );
}
