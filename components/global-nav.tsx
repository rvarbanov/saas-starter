import Link from "next/link";

export function GlobalNav() {
  return (
    <header className="nav-header">
      <nav aria-label="Global" className="nav-bar">
        <Link className="link-nav" href="/">
          Home
        </Link>
        <div className="nav-links">
          {/* Plain <a>: full navigation to protected routes so authkitProxy starts OAuth with one PKCE cookie */}
          <a className="link-nav" href="/dashboard">
            Sign in
          </a>
          <a className="link-nav" href="/sign-up/start">
            Sign up
          </a>
        </div>
      </nav>
    </header>
  );
}
