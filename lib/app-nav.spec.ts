import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "./app-routes";
import { appBreadcrumbLeaf, isAppNavActive } from "./app-nav";

describe("isAppNavActive", () => {
  it("matches Dashboard exactly", () => {
    expect(isAppNavActive("/dashboard", APP_ROUTES.dashboard, "exact")).toBe(true);
    expect(isAppNavActive("/dashboard/users", APP_ROUTES.dashboard, "exact")).toBe(false);
  });

  it("matches other items by prefix", () => {
    expect(isAppNavActive("/dashboard/users", APP_ROUTES.users, "prefix")).toBe(true);
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
