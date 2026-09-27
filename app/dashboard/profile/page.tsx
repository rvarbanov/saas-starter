import { withAuth } from "@workos-inc/authkit-nextjs";
import { ProfileForm } from "@/components/profile-form";

export const metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

/** Protected profile page — shared user form for the signed-in App user. */
export default async function ProfilePage() {
  await withAuth({ ensureSignedIn: true });

  return (
    <div className="page-main">
      <ProfileForm />
    </div>
  );
}
