import { describe, expect, it } from "vitest";
import { assertAssignableRoles, mergeRolesPreservingSuperAdmin } from "./roles";

describe("assertAssignableRoles", () => {
  it("accepts manager and team_member", () => {
    expect(assertAssignableRoles(["team_member", "manager", "manager"])).toEqual([
      "team_member",
      "manager",
    ]);
  });

  it("rejects super_admin", () => {
    expect(() => assertAssignableRoles(["super_admin"])).toThrow(/super_admin/);
  });
});

describe("mergeRolesPreservingSuperAdmin", () => {
  it("keeps super_admin when present", () => {
    expect(mergeRolesPreservingSuperAdmin(["super_admin", "team_member"], ["manager"])).toEqual([
      "super_admin",
      "manager",
    ]);
  });

  it("does not invent super_admin", () => {
    expect(mergeRolesPreservingSuperAdmin(["manager"], ["team_member"])).toEqual(["team_member"]);
  });
});
