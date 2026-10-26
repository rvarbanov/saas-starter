import { describe, expect, it } from "vitest";
import { usersRouteAction } from "./users-route-action";

describe("usersRouteAction", () => {
  it("maps list, create, edit, and detail", () => {
    expect(usersRouteAction("/dashboard/users")).toEqual({ domain: "users", action: "list" });
    expect(usersRouteAction("/dashboard/users/")).toEqual({ domain: "users", action: "list" });
    expect(usersRouteAction("/dashboard/users/new")).toEqual({
      domain: "users",
      action: "create",
    });
    expect(usersRouteAction("/dashboard/users/abc/edit")).toEqual({
      domain: "users",
      action: "update",
    });
    expect(usersRouteAction("/dashboard/users/abc")).toEqual({ domain: "users", action: "read" });
  });
});
