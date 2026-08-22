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
