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

/** Roles the User detail editor may set (never includes `super_admin`). */
export const ASSIGNABLE_ROLES = ["manager", "team_member"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(role: Role): role is AssignableRole {
  return role === "manager" || role === "team_member";
}

/**
 * Validate User detail `roles` args: assignable roles only, reject `super_admin`.
 * Returns a deduped assignable set (may be empty).
 */
export function assertAssignableRoles(roles: readonly Role[]): AssignableRole[] {
  for (const role of roles) {
    if (role === "super_admin") {
      throw new Error("Cannot assign super_admin via User detail");
    }
    if (!isAssignableRole(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
  }
  return uniqueRoles(roles) as AssignableRole[];
}

/**
 * Merge assignable roles from the editor with any existing `super_admin` on the subject.
 * Prevents accidental demotion when the UI never offered `super_admin`.
 */
export function mergeRolesPreservingSuperAdmin(
  existing: readonly Role[] | undefined,
  assignable: readonly AssignableRole[],
): Role[] {
  const next: Role[] = [];
  if (hasRole(existing, "super_admin")) {
    next.push("super_admin");
  }
  for (const role of uniqueRoles(assignable)) {
    next.push(role);
  }
  return next;
}
