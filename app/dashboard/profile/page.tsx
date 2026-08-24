import { withAuth } from "@workos-inc/authkit-nextjs";
import { ProfileNameForm } from "@/components/profile-name-form";

export const metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

/** Protected profile page — edit Convex-owned first/last name. */
export default async function ProfilePage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="page-main">
      <p className="text-eyebrow">Profile</p>
      <h1 className="heading-section">Your name</h1>
      <ProfileNameForm fallbackEmail={user.email} />
    </div>
  );
}
