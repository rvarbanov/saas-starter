import { describe, expect, it } from "vitest";
import {
  appBreadcrumbLeaf,
  appBreadcrumbTrail,
  isAppNavActive,
  userDetailLeafLabel,
} from "./app-nav";
import { APP_ROUTES, parseUserDetailId, userDetailPath } from "./app-routes";

describe("isAppNavActive", () => {
  it("matches Dashboard exactly", () => {
    expect(isAppNavActive("/dashboard", APP_ROUTES.dashboard, "exact")).toBe(true);
    expect(isAppNavActive("/dashboard/users", APP_ROUTES.dashboard, "exact")).toBe(false);
  });

  it("matches other items by prefix", () => {
    expect(isAppNavActive("/dashboard/users", APP_ROUTES.users, "prefix")).toBe(true);
    expect(isAppNavActive("/dashboard/users/abc", APP_ROUTES.users, "prefix")).toBe(true);
    expect(isAppNavActive("/dashboard/coming-soon", APP_ROUTES.comingSoon, "prefix")).toBe(true);
    expect(isAppNavActive("/dashboard", APP_ROUTES.users, "prefix")).toBe(false);
  });
});

describe("appBreadcrumbLeaf", () => {
  it("is null on Dashboard", () => {
    expect(appBreadcrumbLeaf("/dashboard")).toBeNull();
  });

  it("returns the locked leaf labels", () => {
    expect(appBreadcrumbLeaf("/dashboard/settings")).toBe("Settings");
    expect(appBreadcrumbLeaf("/dashboard/profile")).toBe("Profile");
    expect(appBreadcrumbLeaf("/dashboard/users")).toBe("Users");
    expect(appBreadcrumbLeaf("/dashboard/coming-soon")).toBe("Coming soon");
  });
});

describe("appBreadcrumbTrail", () => {
  it("builds Users → person for User detail", () => {
    expect(
      appBreadcrumbTrail("/dashboard/users/j57abc", { userDetailLeaf: "Ada Lovelace" }),
    ).toEqual([{ label: "Users", href: APP_ROUTES.users }, { label: "Ada Lovelace" }]);
  });
});

describe("userDetailPath / parseUserDetailId", () => {
  it("round-trips an id segment", () => {
    expect(userDetailPath("j57abc")).toBe("/dashboard/users/j57abc");
    expect(parseUserDetailId("/dashboard/users/j57abc")).toBe("j57abc");
    expect(parseUserDetailId("/dashboard/users")).toBeNull();
  });
});

describe("userDetailLeafLabel", () => {
  it("prefers first+last, then name, then email", () => {
    expect(userDetailLeafLabel({ firstName: "Ada", lastName: "Lovelace", email: "a@b.c" })).toBe(
      "Ada Lovelace",
    );
    expect(userDetailLeafLabel({ name: "Ada L", email: "a@b.c" })).toBe("Ada L");
    expect(userDetailLeafLabel({ email: "a@b.c" })).toBe("a@b.c");
    expect(userDetailLeafLabel({})).toBe("User");
  });
});
