import Link from "next/link";

const linkClassName =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function GlobalNav() {
  return (
    <header className="border-b border-border bg-background">
      <nav
        aria-label="Global"
        className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6"
      >
        <Link className={linkClassName} href="/">
          Home
        </Link>
        <div className="flex items-center gap-4">
          {/* Plain <a>: full navigation to protected routes so authkitProxy starts OAuth with one PKCE cookie */}
          <a className={linkClassName} href="/dashboard">
            Sign in
          </a>
          <a className={linkClassName} href="/sign-up/start">
            Sign up
          </a>
        </div>
      </nav>
    </header>
  );
}
