import { v } from "convex/values";

/**
 * Access enforcement MVP 1 Role codes.
 * `team_member` stays stored until a later cleanup and is not a Users catalog Role.
 */
export const ROLE_VALUES = ["SYS_ADM", "USR_ADM", "USR_MGR", "USR_VWR", "team_member"] as const;

export type Role = (typeof ROLE_VALUES)[number];

export const roleValidator = v.union(
  v.literal("SYS_ADM"),
  v.literal("USR_ADM"),
  v.literal("USR_MGR"),
  v.literal("USR_VWR"),
  v.literal("team_member"),
);

export const rolesValidator = v.array(roleValidator);

/** Missing / undefined roles (pre-RBAC rows) behave as an empty set. */
export function normalizeRoles(roles: readonly Role[] | undefined): Role[] {
  return roles === undefined ? [] : [...roles];
}

/** Deduplicate while preserving first-seen order. */
export function uniqueRoles(roles: readonly Role[]): Role[] {
  const seen = new Set<Role>();
  const result: Role[] = [];
  for (const role of roles) {
    if (!seen.has(role)) {
      seen.add(role);
      result.push(role);
    }
  }
  return result;
}

export function hasRole(roles: readonly Role[] | undefined, role: Role): boolean {
  return normalizeRoles(roles).includes(role);
}

export function hasAnyRole(roles: readonly Role[] | undefined, wanted: readonly Role[]): boolean {
  const set = new Set(normalizeRoles(roles));
  return wanted.some((role) => set.has(role));
}

/**
 * Map legacy stored codes onto the MVP 1 Role codes.
 * `team_member` and unknown codes are unchanged. Does not invent `USR_ADM` or `USR_VWR`.
 */
export function migrateLegacyRoleCode(code: string): string {
  if (code === "super_admin") {
    return "SYS_ADM";
  }
  if (code === "manager") {
    return "USR_MGR";
  }
  return code;
}
