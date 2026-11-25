/** True when the URL’s host is loopback (committed `.env` localhost values). */
function isLoopbackUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function httpsOriginFromHost(host: string): string {
  const hostname = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${hostname}`;
}

/**
 * Deployment origin from Vercel system env vars.
 * Preview prefers the stable git-branch alias (`VERCEL_BRANCH_URL`) so WorkOS
 * can allow-list one callback per branch instead of every commit deployment.
 * Production prefers `VERCEL_PROJECT_PRODUCTION_URL` (falls back to `VERCEL_URL`).
 */
function vercelDeploymentOrigin(): string | undefined {
  const env = process.env.VERCEL_ENV;
  if (env === "preview") {
    const host = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
    return host ? httpsOriginFromHost(host) : undefined;
  }
  if (env === "production") {
    const host =
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
    return host ? httpsOriginFromHost(host) : undefined;
  }
  return undefined;
}

/**
 * Use an explicit public URL when set, except ignore loopback values on Vercel.
 * Committed `.env` ships `http://localhost:3000` into Preview/Production builds;
 * those must not beat the deployment host.
 */
function configuredPublicOrigin(envValue: string | undefined): string | undefined {
  const configured = envValue?.trim();
  if (!configured) {
    return undefined;
  }
  const normalized = stripTrailingSlash(configured);
  if (process.env.VERCEL_ENV && isLoopbackUrl(normalized)) {
    return undefined;
  }
  return normalized;
}

/** Canonical app origin for OAuth returnTo / sign-out redirects. */
export function appOrigin(): string {
  const configured = configuredPublicOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) {
    return configured;
  }
  const vercel = vercelDeploymentOrigin();
  if (vercel) {
    return vercel;
  }
  return "http://localhost:3000";
}

/** Home URL after sign-out (matches WorkOS Sign-out redirects). */
export function appHomeUrl(): string {
  return `${appOrigin()}/`;
}

/**
 * WorkOS AuthKit callback URL. Pass to `authkitProxy({ redirectUri })` so Preview
 * does not use the committed localhost `NEXT_PUBLIC_WORKOS_REDIRECT_URI`.
 */
export function workosRedirectUri(): string {
  const configured = configuredPublicOrigin(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI);
  if (configured) {
    return configured;
  }
  return `${appOrigin()}/callback`;
}
