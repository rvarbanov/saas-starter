import { signOut } from "@workos-inc/authkit-nextjs";

function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** Ends the WorkOS session and redirects via WorkOS logout (returnTo = app home). */
export async function GET() {
  await signOut({ returnTo: `${appOrigin()}/` });
}
