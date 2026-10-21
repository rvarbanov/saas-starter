import { describe, expect, it } from "vitest";
import { hasRole, migrateLegacyRoleCode, normalizeRoles } from "./roles";

describe("migrateLegacyRoleCode", () => {
  it("maps super_admin and manager and leaves other codes", () => {
    expect(migrateLegacyRoleCode("super_admin")).toBe("SYS_ADM");
    expect(migrateLegacyRoleCode("manager")).toBe("USR_MGR");
    expect(migrateLegacyRoleCode("team_member")).toBe("team_member");
    expect(migrateLegacyRoleCode("USR_ADM")).toBe("USR_ADM");
    expect(migrateLegacyRoleCode("USR_VWR")).toBe("USR_VWR");
  });
});

describe("normalizeRoles", () => {
  it("treats missing roles as empty and keeps team_member", () => {
    expect(normalizeRoles(undefined)).toEqual([]);
    expect(hasRole(["team_member"], "team_member")).toBe(true);
    expect(hasRole(["team_member"], "SYS_ADM")).toBe(false);
  });
});
