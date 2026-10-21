import { describe, expect, it } from "vitest";
import { allows, catalogPair } from "./authzCatalog";

describe("authz catalog", () => {
  it("lists SYS_ADM on every Users Action and does not treat it as a silent wildcard", () => {
    const actions = ["list", "read", "create", "update", "delete", "changes.read"] as const;
    for (const action of actions) {
      expect(allows(["SYS_ADM"], { domain: "users", action })).toBe(true);
    }
    expect(allows(["USR_VWR"], { domain: "users", action: "list" })).toBe(true);
    expect(allows(["USR_VWR"], { domain: "users", action: "read" })).toBe(true);
    expect(allows(["USR_VWR"], { domain: "users", action: "create" })).toBe(false);
    expect(allows(["USR_VWR"], { domain: "users", action: "update" })).toBe(false);
    expect(allows(["USR_VWR"], { domain: "users", action: "delete" })).toBe(false);
    expect(allows(["USR_VWR"], { domain: "users", action: "changes.read" })).toBe(false);
    expect(allows(["USR_MGR"], { domain: "users", action: "delete" })).toBe(false);
    expect(allows(["USR_MGR"], { domain: "users", action: "create" })).toBe(true);
    expect(allows(["USR_MGR"], { domain: "users", action: "update" })).toBe(true);
    expect(allows(["USR_MGR"], { domain: "users", action: "changes.read" })).toBe(true);
    expect(allows(["USR_ADM"], { domain: "users", action: "delete" })).toBe(true);
  });

  it("allows Profile Actions for every provisioned role set, including empty and team_member", () => {
    expect(allows([], { domain: "profile", action: "self.read" })).toBe(true);
    expect(allows([], { domain: "profile", action: "self.write" })).toBe(true);
    expect(allows(["team_member"], { domain: "profile", action: "self.write" })).toBe(true);
    expect(allows(["team_member"], { domain: "users", action: "list" })).toBe(false);
    expect(allows(undefined, { domain: "users", action: "read" })).toBe(false);
  });

  it("returns null for a pair that is not in the catalog", () => {
    expect(catalogPair("users", "self.read")).toBeNull();
    expect(catalogPair("profile", "list")).toBeNull();
    expect(catalogPair("billing", "list")).toBeNull();
  });
});
