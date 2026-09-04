import { describe, expect, it } from "vitest";
import { hasAnyRole, hasRole, isManager, isSuperAdmin, normalizeRoles, uniqueRoles } from "./roles";

describe("normalizeRoles", () => {
  it("treats undefined as empty", () => {
    expect(normalizeRoles(undefined)).toEqual([]);
  });

  it("copies defined roles", () => {
    expect(normalizeRoles(["manager", "team_member"])).toEqual(["manager", "team_member"]);
  });
});

describe("uniqueRoles", () => {
  it("dedupes while preserving order", () => {
    expect(uniqueRoles(["team_member", "manager", "team_member", "super_admin"])).toEqual([
      "team_member",
      "manager",
      "super_admin",
    ]);
  });
});

describe("role checks", () => {
  it("detects Super admin and Manager independently", () => {
    expect(isSuperAdmin(["super_admin"])).toBe(true);
    expect(isSuperAdmin(["manager"])).toBe(false);
    expect(isManager(["manager", "team_member"])).toBe(true);
    expect(isManager(["team_member"])).toBe(false);
  });

  it("supports hasRole / hasAnyRole", () => {
    expect(hasRole(["manager"], "manager")).toBe(true);
    expect(hasRole(["manager"], "super_admin")).toBe(false);
    expect(hasAnyRole(["team_member"], ["super_admin", "manager"])).toBe(false);
    expect(hasAnyRole(["manager"], ["super_admin", "manager"])).toBe(true);
  });
});
