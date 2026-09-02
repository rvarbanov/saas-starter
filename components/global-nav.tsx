"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/app-routes";

function AuthNavLinks() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <span aria-hidden className="link-nav-skeleton">
          …
        </span>
        <span aria-hidden className="link-nav-skeleton">
          …
        </span>
      </>
    );
  }

  if (user) {
    return (
      <Link className="link-nav" href={APP_ROUTES.dashboard} prefetch={false}>
        Dashboard
      </Link>
    );
  }

  return (
    <>
      {/* Plain <a>: full navigation to protected routes so authkitProxy starts OAuth with one PKCE cookie */}
      <a className="link-nav" href={APP_ROUTES.dashboard}>
        Sign in
      </a>
      <a className="link-nav" href="/sign-up/start">
        Sign up
      </a>
    </>
  );
}

export function GlobalNav() {
  return (
    <header className="nav-header">
      <nav aria-label="Global" className="nav-bar">
        <Link className="link-nav" href="/">
          Home
        </Link>
        <div className="nav-links">
          <AuthNavLinks />
        </div>
      </nav>
    </header>
  );
}
