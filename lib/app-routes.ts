/**
 * Closed authenticated-shell path set (`/dashboard/*`).
 * AuthKit public paths stay in `lib/auth-paths.ts`.
 */
export const APP_ROUTES = {
  dashboard: "/dashboard",
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",
  users: "/dashboard/users",
  usersNew: "/dashboard/users/new",
  comingSoon: "/dashboard/coming-soon",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export const RESERVED_ROUTE_SEGMENTS = ["new", "edit"] as const;

export function isReservedRouteSegment(segment: string): boolean {
  return (RESERVED_ROUTE_SEGMENTS as readonly string[]).includes(segment);
}

/** User detail path for a Convex `users` `_id`. */
export function userDetailPath(userId: string): string {
  return `${APP_ROUTES.users}/${userId}`;
}

/** Create User page. */
export function createUserPath(): string {
  return APP_ROUTES.usersNew;
}

/**
 * Parse `/dashboard/users/{userId}` (not the list or Create User route).
 * Returns the raw path segment; callers validate Convex id shape via `getById` → null.
 */
export function parseUserDetailId(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === APP_ROUTES.users || !path.startsWith(`${APP_ROUTES.users}/`)) {
    return null;
  }
  const rest = path.slice(APP_ROUTES.users.length + 1);
  if (!rest || rest.includes("/") || isReservedRouteSegment(rest)) {
    return null;
  }
  return rest;
}
