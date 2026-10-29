import { describe, expect, it } from "vitest";
import {
  hasRole,
  LEGACY_TEAM_MEMBER_ROLE_CODE,
  migrateLegacyRoleCode,
  normalizeRoles,
  stripTeamMemberRoleCode,
} from "./roles";

describe("migrateLegacyRoleCode", () => {
  it("maps super_admin and manager and leaves other codes", () => {
    expect(migrateLegacyRoleCode("super_admin")).toBe("SYS_ADM");
    expect(migrateLegacyRoleCode("manager")).toBe("USR_MGR");
    expect(migrateLegacyRoleCode(LEGACY_TEAM_MEMBER_ROLE_CODE)).toBe("team_member");
    expect(migrateLegacyRoleCode("USR_ADM")).toBe("USR_ADM");
    expect(migrateLegacyRoleCode("USR_VWR")).toBe("USR_VWR");
  });
});

describe("normalizeRoles", () => {
  it("treats missing roles as empty", () => {
    expect(normalizeRoles(undefined)).toEqual([]);
    expect(hasRole([], "SYS_ADM")).toBe(false);
    expect(hasRole(["USR_VWR"], "USR_VWR")).toBe(true);
  });
});

describe("stripTeamMemberRoleCode", () => {
  it("strips a sole team_member to an empty Role set", () => {
    expect(stripTeamMemberRoleCode(["team_member"])).toEqual({
      changed: true,
      roles: [],
      beforeLiteral: "team_member",
      afterLiteral: null,
    });
  });

  it("keeps other Roles in first-seen order", () => {
    expect(stripTeamMemberRoleCode(["SYS_ADM", "team_member", "USR_MGR"])).toEqual({
      changed: true,
      roles: ["SYS_ADM", "USR_MGR"],
      beforeLiteral: "SYS_ADM, team_member, USR_MGR",
      afterLiteral: "SYS_ADM, USR_MGR",
    });
  });

  it("is a no-op when team_member is absent", () => {
    expect(stripTeamMemberRoleCode(["USR_ADM"])).toEqual({
      changed: false,
      roles: ["USR_ADM"],
      beforeLiteral: "USR_ADM",
      afterLiteral: "USR_ADM",
    });
    expect(stripTeamMemberRoleCode(undefined)).toEqual({
      changed: false,
      roles: [],
      beforeLiteral: null,
      afterLiteral: null,
    });
  });
});
