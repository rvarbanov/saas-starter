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
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">Profile</p>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Your name</h1>
      <ProfileNameForm fallbackEmail={user.email} />
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        href="/settings"
        prefetch={false}
      >
        Back to settings
      </Link>
    </main>
  );
}
