import { hasAnyRole, type Role } from "./roles";

export const USERS_ACTIONS = [
  "list",
  "read",
  "create",
  "update",
  "delete",
  "changes.read",
] as const;

export const PROFILE_ACTIONS = ["self.read", "self.write"] as const;

export type UsersAction = (typeof USERS_ACTIONS)[number];

export type ProfileAction = (typeof PROFILE_ACTIONS)[number];

export type CanArgs =
  | { domain: "users"; action: UsersAction }
  | { domain: "profile"; action: ProfileAction };

/**
 * Explicit Role allow-lists. `SYS_ADM` is listed on every Role-gated Action.
 * Profile Actions use the catalog sentinel `ANY` (every provisioned App user).
 */
const USERS_ALLOW: Record<UsersAction, readonly Role[]> = {
  list: ["SYS_ADM", "USR_ADM", "USR_MGR", "USR_VWR"],
  read: ["SYS_ADM", "USR_ADM", "USR_MGR", "USR_VWR"],
  create: ["SYS_ADM", "USR_ADM", "USR_MGR"],
  update: ["SYS_ADM", "USR_ADM", "USR_MGR"],
  delete: ["SYS_ADM", "USR_ADM"],
  "changes.read": ["SYS_ADM", "USR_ADM", "USR_MGR"],
};

export function allows(roles: readonly Role[] | undefined, args: CanArgs): boolean {
  if (args.domain === "profile") {
    return true;
  }
  const allowed = USERS_ALLOW[args.action];
  if (allowed === undefined) {
    return false;
  }
  return hasAnyRole(roles, allowed);
}

/** Narrow a `{ domain, action }` pair onto the catalog, or null when the pair is not listed. */
export function catalogPair(domain: string, action: string): CanArgs | null {
  if (domain === "users" && (USERS_ACTIONS as readonly string[]).includes(action)) {
    return { domain: "users", action: action as UsersAction };
  }
  if (domain === "profile" && (PROFILE_ACTIONS as readonly string[]).includes(action)) {
    return { domain: "profile", action: action as ProfileAction };
  }
  return null;
}
