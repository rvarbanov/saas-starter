import { describe, expect, it } from "vitest";
import { hasRole, migrateLegacyRoleCode, normalizeRoles } from "./roles";

describe("migrateLegacyRoleCode", () => {
  it("maps super_admin and manager and leaves other codes", () => {
    expect(migrateLegacyRoleCode("super_admin")).toBe("SYS_ADM");
    expect(migrateLegacyRoleCode("manager")).toBe("USR_MGR");
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
