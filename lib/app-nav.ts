import { APP_ROUTES, parseUserDetailId } from "@/lib/app-routes";

export type AppNavMatch = "exact" | "prefix";

export const APP_NAV_ITEMS: ReadonlyArray<{
  title: string;
  href: string;
  match: AppNavMatch;
}> = [
  { title: "Dashboard", href: APP_ROUTES.dashboard, match: "exact" },
  { title: "Users", href: APP_ROUTES.users, match: "prefix" },
  { title: "Coming soon", href: APP_ROUTES.comingSoon, match: "prefix" },
];

export function isAppNavActive(pathname: string, href: string, match: AppNavMatch): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  if (match === "exact") {
    return path === target;
  }
  return path === target || path.startsWith(`${target}/`);
}

const BREADCRUMB_LEAVES: Record<string, string> = {
  [APP_ROUTES.settings]: "Settings",
  [APP_ROUTES.profile]: "Profile",
  [APP_ROUTES.users]: "Users",
  [APP_ROUTES.comingSoon]: "Coming soon",
};

export type AppBreadcrumbSegment = {
  label: string;
  href?: string;
};

/**
 * Breadcrumb trail for the App header (after the always-present Dashboard root).
 * User detail: Users (link) → person leaf (resolved separately when label known).
 */
export function appBreadcrumbTrail(
  pathname: string,
  options?: { userDetailLeaf?: string },
): AppBreadcrumbSegment[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === APP_ROUTES.dashboard) {
    return [];
  }

  const userId = parseUserDetailId(path);
  if (userId !== null) {
    return [
      { label: "Users", href: APP_ROUTES.users },
      { label: options?.userDetailLeaf ?? "User" },
    ];
  }

  const leaf = BREADCRUMB_LEAVES[path];
  if (leaf) {
    return [{ label: leaf }];
  }

  return [];
}

/** @deprecated Prefer `appBreadcrumbTrail` for multi-segment crumbs. */
export function appBreadcrumbLeaf(pathname: string): string | null {
  const trail = appBreadcrumbTrail(pathname);
  if (trail.length === 0) {
    return null;
  }
  return trail[trail.length - 1]?.label ?? null;
}

/** Leaf label for User detail: first+last → name → email → "User". */
export function userDetailLeafLabel(user: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}): string {
  const full = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ");
  if (full) {
    return full;
  }
  const combined = user.name?.trim();
  if (combined) {
    return combined;
  }
  const email = user.email?.trim();
  if (email) {
    return email;
  }
  return "User";
}
