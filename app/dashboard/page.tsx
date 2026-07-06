import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ConvexDeploymentNote } from "@/components/convex-deployment-note";
import { ConvexUserDisplay } from "@/components/convex-user-display";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Signed in</h1>
      <p className="text-muted-foreground">
        {user.email ?? user.id} — authenticated via WorkOS AuthKit.
      </p>
      <ConvexUserDisplay />
      <ConvexDeploymentNote />
      <div className="flex flex-wrap items-center gap-4">
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/settings"
          prefetch={false}
        >
          Settings
        </Link>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/"
          prefetch={false}
        >
          Back to home
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
