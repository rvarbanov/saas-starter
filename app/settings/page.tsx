import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ConvexUserDisplay } from "@/components/convex-user-display";

export const metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

/** Example protected route (same auth shell as `/dashboard`). */
export default async function SettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="page-main">
      <p className="text-eyebrow">Settings</p>
      <h1 className="heading-section">Account</h1>
      <p className="text-body">WorkOS session: {user.email ?? user.id}</p>
      <ConvexUserDisplay />
      <div className="action-row">
        <Link className="link-primary" href="/profile" prefetch={false}>
          Profile
        </Link>
        <Link className="link-primary" href="/dashboard" prefetch={false}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
