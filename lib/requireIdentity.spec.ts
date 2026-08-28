import type { UserIdentity } from "convex/server";
import { describe, expect, it } from "vitest";
import { identityOrThrow } from "../convex/lib/auth";

describe("identityOrThrow", () => {
  it("throws Not authenticated when identity is missing", () => {
    expect(() => identityOrThrow(null)).toThrow("Not authenticated");
  });

  it("returns the identity when present", () => {
    const identity = {
      tokenIdentifier: "https://issuer|user_1",
      subject: "user_1",
      issuer: "https://issuer",
    } as UserIdentity;
    expect(identityOrThrow(identity)).toBe(identity);
  });
});
