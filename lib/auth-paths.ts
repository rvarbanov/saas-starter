/**
 * Paths allowed without a WorkOS session (`authkitProxy` → `middlewareAuth.unauthenticatedPaths`).
 * Use exact pathnames; add new entries when introducing public auth-related routes.
 */
export const AUTHKIT_UNAUTHENTICATED_PATHS = [
  "/",
  "/api/health",
  "/callback",
  "/sign-in",
  "/sign-in/redirect",
  "/sign-up",
] as const;

const publicPathSet = new Set<string>(AUTHKIT_UNAUTHENTICATED_PATHS);

/** Whether `pathname` is allowed for anonymous users under AuthKit middleware auth. */
export function isAuthKitPublicPath(pathname: string): boolean {
  return publicPathSet.has(pathname);
}
