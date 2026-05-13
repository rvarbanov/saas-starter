import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

export const metadata = {
  title: "Settings",
};

/** Example protected route (same auth shell as `/dashboard`). */
export default async function SettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">Settings</p>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Account</h1>
      <p className="text-muted-foreground">{user.email ?? user.id}</p>
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        href="/dashboard"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
