import Link from "next/link";

export const metadata = {
  title: "Sign in",
};

/** Landing step before WorkOS AuthKit (email + password on the hosted AuthKit screen). */
export default function SignInPage() {
  return (
    <main className="page-auth">
      <div className="stack-sm">
        <p className="text-eyebrow">WorkOS AuthKit</p>
        <h1 className="heading-page">Sign in</h1>
        <p className="text-body">
          Continue to the secure WorkOS screen to sign in with your <strong>email</strong> and{" "}
          <strong>password</strong> (and any MFA your organization requires).
        </p>
      </div>
      <div className="stack-md">
        {/* Plain <a>: full navigation to a protected route so authkitProxy starts OAuth with one PKCE cookie */}
        <a className="btn-primary-lg" href="/dashboard">
          Continue to sign in
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
