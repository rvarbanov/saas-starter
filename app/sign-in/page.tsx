import Link from "next/link";

export const metadata = {
  title: "Sign in",
};

/** Landing step before WorkOS AuthKit (email + password on the hosted AuthKit screen). */
export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">WorkOS AuthKit</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-muted-foreground">
          Continue to the secure WorkOS screen to sign in with your <strong>email</strong> and{" "}
          <strong>password</strong> (and any MFA your organization requires).
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {/* Plain <a>: full navigation to the redirect Route Handler — avoids Link soft-nav flash before external OAuth */}
        <a
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          href="/sign-in/redirect"
        >
          Continue to sign in
        </a>
        <Link
          className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
