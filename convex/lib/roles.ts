import { v } from "convex/values";

/**
 * Access enforcement MVP 1 Role codes.
 * Legacy `team_member` is stripped by `users:stripTeamMemberRoles` and is not a Role.
 */
export const ROLE_VALUES = ["SYS_ADM", "USR_ADM", "USR_MGR", "USR_VWR"] as const;

export type Role = (typeof ROLE_VALUES)[number];

/** Stored code removed by RAD-180. Not a Role; kept for migration + Change display. */
export const LEGACY_TEAM_MEMBER_ROLE_CODE = "team_member";

export const roleValidator = v.union(
  v.literal("SYS_ADM"),
  v.literal("USR_ADM"),
  v.literal("USR_MGR"),
  v.literal("USR_VWR"),
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

function rolesLiteral(codes: readonly string[]): string | null {
  if (codes.length === 0) {
    return null;
  }
  return codes.join(", ");
}

/**
 * Remove legacy `team_member` from a stored roles array.
 * Keeps other Role codes in first-seen order. Used by the strip migration.
 */
export function stripTeamMemberRoleCode(roles: readonly string[] | undefined): {
  changed: boolean;
  roles: Role[];
  beforeLiteral: string | null;
  afterLiteral: string | null;
} {
  const before = roles === undefined ? [] : [...roles];
  const afterCodes = before.filter((code) => code !== LEGACY_TEAM_MEMBER_ROLE_CODE);
  const changed = afterCodes.length !== before.length;
  const liveRoles = uniqueRoles(
    afterCodes.filter((code): code is Role => (ROLE_VALUES as readonly string[]).includes(code)),
  );
  return {
    changed,
    roles: liveRoles,
    beforeLiteral: rolesLiteral(before),
    afterLiteral: rolesLiteral(liveRoles),
  };
}

/**
 * Map legacy stored codes onto the MVP 1 Role codes.
 * Does not invent `USR_ADM` or `USR_VWR`. Stripping `team_member` is
 * `stripTeamMemberRoleCode` / `users:stripTeamMemberRoles`, not this helper.
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
