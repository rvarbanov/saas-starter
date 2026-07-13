import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ConvexDeploymentNote } from "@/components/convex-deployment-note";
import { ConvexUserDisplay } from "@/components/convex-user-display";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="page-main">
      <p className="text-eyebrow">Dashboard</p>
      <h1 className="heading-page">Signed in</h1>
      <p className="text-body">
        {user.email ?? user.id} — authenticated via WorkOS AuthKit.
      </p>
      <ConvexUserDisplay />
      <ConvexDeploymentNote />
      <div className="action-row">
        <Link className="link-primary" href="/settings" prefetch={false}>
          Settings
        </Link>
        <Link className="link-primary" href="/" prefetch={false}>
          Back to home
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
