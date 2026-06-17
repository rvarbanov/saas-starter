/** WorkOS sign-out via GET route (server actions cannot redirect to external logout URLs). */
export function SignOutButton() {
  return (
    <form action="/sign-out" method="GET">
      <button
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
