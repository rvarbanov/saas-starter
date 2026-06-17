/** Canonical app origin for OAuth returnTo / sign-out redirects. */
export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** Home URL after sign-out (matches WorkOS Sign-out redirects). */
export function appHomeUrl(): string {
  return `${appOrigin()}/`;
}
