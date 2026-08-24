import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexUserDisplay } from "@/components/convex-user-display";

export const metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

/** Example protected route (same App frame as the dashboard). */
export default async function SettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="page-main">
      <p className="text-eyebrow">Settings</p>
      <h1 className="heading-section">Account</h1>
      <p className="text-body">WorkOS session: {user.email ?? user.id}</p>
      <ConvexUserDisplay />
    </div>
  );
}
