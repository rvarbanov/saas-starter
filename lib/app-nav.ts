import { APP_ROUTES } from "@/lib/app-routes";

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

export function appBreadcrumbLeaf(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === APP_ROUTES.dashboard) {
    return null;
  }
  return BREADCRUMB_LEAVES[path] ?? null;
}
