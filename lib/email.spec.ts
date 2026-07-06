import { describe, expect, it } from "vitest";

import { assertValidEmailFormat, normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("assertValidEmailFormat", () => {
  it("accepts a well-formed address", () => {
    expect(() => assertValidEmailFormat("user@example.com")).not.toThrow();
  });

  it("normalizes before validating", () => {
    expect(() => assertValidEmailFormat("  User@Example.COM  ")).not.toThrow();
  });

  it("rejects missing @", () => {
    expect(() => assertValidEmailFormat("not-an-email")).toThrow("Invalid email address");
  });

  it("rejects empty input", () => {
    expect(() => assertValidEmailFormat("   ")).toThrow("Invalid email address");
  });
});
