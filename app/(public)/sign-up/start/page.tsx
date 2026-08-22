import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/app-routes";

export const dynamic = "force-dynamic";

/**
 * Protected OAuth trigger for sign-up.
 * Unauthenticated users are redirected by authkitProxy with screen_hint=sign-up.
 * Authenticated users (post-callback) are sent to the dashboard.
 */
export default async function SignUpStartPage() {
  await withAuth({ ensureSignedIn: true });
  redirect(APP_ROUTES.dashboard);
}
