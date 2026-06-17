import { signOutToHome } from "@/lib/actions/sign-out";

/** WorkOS-recommended sign-out (server action — safe from Link prefetch). */
export function SignOutButton() {
  return (
    <form action={signOutToHome}>
      <button
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
