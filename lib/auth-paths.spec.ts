import { describe, expect, it } from "vitest";
import { AUTHKIT_UNAUTHENTICATED_PATHS, isAuthKitPublicPath } from "./auth-paths";

describe("auth-paths", () => {
  it("lists required public auth routes", () => {
    const paths = new Set(AUTHKIT_UNAUTHENTICATED_PATHS);
    expect(paths.has("/")).toBe(true);
    expect(paths.has("/callback")).toBe(true);
    expect(paths.has("/sign-in")).toBe(true);
    expect(paths.has("/sign-in/redirect")).toBe(true);
  });

  it("treats landing, callback, and sign-in flows as public", () => {
    expect(isAuthKitPublicPath("/")).toBe(true);
    expect(isAuthKitPublicPath("/callback")).toBe(true);
    expect(isAuthKitPublicPath("/sign-in")).toBe(true);
    expect(isAuthKitPublicPath("/sign-in/redirect")).toBe(true);
  });

  it("treats app shell routes as protected", () => {
    expect(isAuthKitPublicPath("/dashboard")).toBe(false);
    expect(isAuthKitPublicPath("/settings")).toBe(false);
  });
});
