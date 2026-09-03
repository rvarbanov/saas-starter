import { v } from "convex/values";

/** Product roles per docs/IMPLEMENTATION.md §4. Multi-role is a set (array). */
export const ROLE_VALUES = ["super_admin", "manager", "team_member"] as const;

export type Role = (typeof ROLE_VALUES)[number];

export const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("manager"),
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

export function isSuperAdmin(roles: readonly Role[] | undefined): boolean {
  return hasRole(roles, "super_admin");
}

export function isManager(roles: readonly Role[] | undefined): boolean {
  return hasRole(roles, "manager");
}

/** Union check used by directory gating (RAD-70) and similar privileged reads. */
export function isSuperAdminOrManager(roles: readonly Role[] | undefined): boolean {
  return hasAnyRole(roles, ["super_admin", "manager"]);
}

/**
 * True when the caller has Team member and neither Super admin nor Manager.
 * Empty role sets are not Team member-only.
 */
export function isTeamMemberOnly(roles: readonly Role[] | undefined): boolean {
  const normalized = normalizeRoles(roles);
  return hasRole(normalized, "team_member") && !isSuperAdminOrManager(normalized);
}
