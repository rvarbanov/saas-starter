import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ProfileNameForm } from "@/components/profile-name-form";

export const metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

/** Protected profile page — edit Convex-owned first/last name. */
export default async function ProfilePage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="page-main">
      <p className="text-eyebrow">Profile</p>
      <h1 className="heading-section">Your name</h1>
      <ProfileNameForm fallbackEmail={user.email} />
      <Link className="link-primary" href="/settings" prefetch={false}>
        Back to settings
      </Link>
    </main>
  );
}
