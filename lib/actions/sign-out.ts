"use server";

import { signOut } from "@workos-inc/authkit-nextjs";
import { appHomeUrl } from "@/lib/app-origin";

/** Ends WorkOS session and redirects to app home (WorkOS Sign-out redirects). */
export async function signOutToHome(): Promise<void> {
  await signOut({ returnTo: appHomeUrl() });
}
