"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Link from "next/link";

/** Home CTA driven by client session so it stays correct after in-app navigation. */
export function AuthHomeCta() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span aria-hidden className="btn-skeleton">
        …
      </span>
    );
  }

  if (user) {
    return (
      <Link className="btn-primary" href="/dashboard" prefetch={false}>
        Dashboard
      </Link>
    );
  }

  return (
    <Link className="btn-primary" href="/sign-in">
      Sign in
    </Link>
  );
}
