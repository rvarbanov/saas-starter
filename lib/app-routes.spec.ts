import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "./app-routes";

describe("app-routes", () => {
  it("exposes the closed shell path set under /dashboard", () => {
    expect(APP_ROUTES.dashboard).toBe("/dashboard");
    expect(APP_ROUTES.settings).toBe("/dashboard/settings");
    expect(APP_ROUTES.profile).toBe("/dashboard/profile");
    expect(APP_ROUTES.users).toBe("/dashboard/users");
    expect(APP_ROUTES.comingSoon).toBe("/dashboard/coming-soon");
  });
});
