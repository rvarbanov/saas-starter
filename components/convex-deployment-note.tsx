/**
 * Server-only hint — avoids client useQuery against a mismatched Convex deployment.
 * Align `NEXT_PUBLIC_CONVEX_URL` with the project `pnpm convex:dev` pushes to (dashboard → Deployments).
 */
export function ConvexDeploymentNote() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url || /placeholder/i.test(url)) {
    return (
      <p className="text-caption">
        Convex: set <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env</code> to your deployment URL
        from the Convex dashboard.
      </p>
    );
  }

  return (
    <p className="text-caption">
      Convex backend <code>{url}</code>: run <code>pnpm convex:dev</code> so this repo pushes
      functions to <strong>that same</strong> deployment (URLs must match). In the Convex dashboard
      → Environment Variables for that deployment, set <code>WORKOS_CLIENT_ID</code> (same value as{" "}
      <code>.env</code>) and <code>WORKOS_API_KEY</code> (from <code>.secret</code>) so user
      provisioning can read email from WorkOS when the JWT omits it.
    </p>
  );
}
