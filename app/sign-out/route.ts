import { signOut } from "@workos-inc/authkit-nextjs";
import { appHomeUrl } from "@/lib/app-origin";

/** GET sign-out — full navigation so WorkOS logout redirect is not fetched via RSC. */
export async function GET() {
  await signOut({ returnTo: appHomeUrl() });
}
