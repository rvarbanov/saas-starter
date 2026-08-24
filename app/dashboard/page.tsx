import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ConvexDeploymentNote } from "@/components/convex-deployment-note";
import { ConvexUserDisplay } from "@/components/convex-user-display";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="page-main">
      <p className="text-eyebrow">Dashboard</p>
      <h1 className="heading-page">Signed in</h1>
      <p className="text-body">{user.email ?? user.id} — authenticated via WorkOS AuthKit.</p>
      <ConvexUserDisplay />
      <ConvexDeploymentNote />
      <div className="action-row">
        <Link className="link-primary" href="/" prefetch={false}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
