import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign up",
};

export const dynamic = "force-dynamic";

/** Landing step before WorkOS AuthKit (email + password on the hosted AuthKit sign-up screen). */
export default async function SignUpPage() {
  const { user } = await withAuth();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="page-auth">
      <div className="stack-sm">
        <p className="text-eyebrow">WorkOS AuthKit</p>
        <h1 className="heading-page">Sign up</h1>
        <p className="text-body">
          Continue to the secure WorkOS screen to create an account with your <strong>email</strong>{" "}
          and <strong>password</strong> (and any MFA your organization requires).
        </p>
      </div>
      <div className="stack-md">
        {/* Plain <a>: full navigation to a protected sign-up path so authkitProxy starts OAuth with screen_hint=sign-up */}
        <a className="btn-primary-lg" href="/sign-up/start">
          Continue to sign up
        </a>
        <Link className="link-primary-center" href="/sign-in">
          Sign in
        </Link>
        <Link className="link-primary-center" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
