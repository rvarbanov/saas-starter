/**
 * Closed authenticated-shell path set (`/dashboard/*`).
 * AuthKit public paths stay in `lib/auth-paths.ts`.
 */
export const APP_ROUTES = {
  dashboard: "/dashboard",
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",
  users: "/dashboard/users",
  comingSoon: "/dashboard/coming-soon",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/** User detail path for a Convex `users` `_id`. */
export function userDetailPath(userId: string): string {
  return `${APP_ROUTES.users}/${userId}`;
}

/**
 * Parse `/dashboard/users/{userId}` (not the list route).
 * Returns the raw path segment; callers validate Convex id shape via `getById` → null.
 */
export function parseUserDetailId(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === APP_ROUTES.users || !path.startsWith(`${APP_ROUTES.users}/`)) {
    return null;
  }
  const rest = path.slice(APP_ROUTES.users.length + 1);
  if (!rest || rest.includes("/")) {
    return null;
  }
  return rest;
}
