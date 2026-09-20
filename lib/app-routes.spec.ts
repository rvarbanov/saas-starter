import { describe, expect, it } from "vitest";
import {
  APP_ROUTES,
  createUserPath,
  isReservedRouteSegment,
  parseUserDetailId,
} from "./app-routes";

describe("app-routes", () => {
  it("exposes the closed shell path set under /dashboard", () => {
    expect(APP_ROUTES.dashboard).toBe("/dashboard");
    expect(APP_ROUTES.settings).toBe("/dashboard/settings");
    expect(APP_ROUTES.profile).toBe("/dashboard/profile");
    expect(APP_ROUTES.users).toBe("/dashboard/users");
    expect(APP_ROUTES.usersNew).toBe("/dashboard/users/new");
    expect(APP_ROUTES.comingSoon).toBe("/dashboard/coming-soon");
  });

  it("returns the Create User path helper", () => {
    expect(createUserPath()).toBe("/dashboard/users/new");
  });

  it("treats new and edit as reserved segments", () => {
    expect(isReservedRouteSegment("new")).toBe(true);
    expect(isReservedRouteSegment("edit")).toBe(true);
    expect(isReservedRouteSegment("j57abc")).toBe(false);
  });

  it("does not parse reserved segments as User detail ids", () => {
    expect(parseUserDetailId("/dashboard/users/new")).toBeNull();
    expect(parseUserDetailId("/dashboard/users/edit")).toBeNull();
    expect(parseUserDetailId("/dashboard/users/j57abc")).toBe("j57abc");
  });
});
