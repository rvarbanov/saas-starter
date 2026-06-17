"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Link from "next/link";

/** Home CTA driven by client session so it stays correct after in-app navigation. */
export function AuthHomeCta() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span
        aria-hidden
        className="inline-flex h-9 min-w-[5.5rem] items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-transparent"
      >
        …
      </span>
    );
  }

  if (user) {
    return (
      <Link
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        href="/dashboard"
        prefetch={false}
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
      href="/sign-in"
    >
      Sign in
    </Link>
  );
}
