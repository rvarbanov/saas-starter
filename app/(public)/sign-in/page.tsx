import Link from "next/link";
import { APP_ROUTES } from "@/lib/app-routes";

export const metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ error?: string; code?: string }>;
};

/** Landing step before WorkOS AuthKit (email + password on the hosted AuthKit screen). */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const showCallbackError = error === "callback";

  return (
    <main className="page-auth">
      <div className="stack-sm">
        <p className="text-eyebrow">WorkOS AuthKit</p>
        <h1 className="heading-page">Sign in</h1>
        {showCallbackError ? (
          <p className="text-body" role="alert">
            Sign-in failed — we couldn&apos;t complete authentication. Please try again.
          </p>
        ) : (
          <p className="text-body">
            Continue to the secure WorkOS screen to sign in with your <strong>email</strong> and{" "}
            <strong>password</strong> (and any MFA your organization requires).
          </p>
        )}
      </div>
      <div className="stack-md">
        {/* Plain <a>: full navigation to a protected route so authkitProxy starts OAuth with one PKCE cookie */}
        <a className="btn-primary-lg" href={APP_ROUTES.dashboard}>
          {showCallbackError ? "Try again" : "Continue to sign in"}
        </a>
        <Link className="link-primary-center" href="/sign-up">
          Sign up
        </Link>
        <Link className="link-primary-center" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
