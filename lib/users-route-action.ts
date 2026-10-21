import { APP_ROUTES, parseUserEditId } from "@/lib/app-routes";

export type UsersRouteAction = {
  domain: "users";
  action: "list" | "read" | "create" | "update";
};

/** Action required before a Users route may load its body. */
export function usersRouteAction(pathname: string): UsersRouteAction {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === APP_ROUTES.users) {
    return { domain: "users", action: "list" };
  }
  if (path === APP_ROUTES.usersNew) {
    return { domain: "users", action: "create" };
  }
  if (parseUserEditId(path) !== null) {
    return { domain: "users", action: "update" };
  }
  return { domain: "users", action: "read" };
}
