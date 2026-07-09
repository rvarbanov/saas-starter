import { describe, expect, it } from "vitest";
import { MAX_NAME_LENGTH, normalizeNames } from "../convex/lib/userNames";

describe("normalizeNames", () => {
  it("trims and joins first and last name", () => {
    expect(normalizeNames("  Ada  ", " Lovelace ")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
    });
  });

  it("returns undefined fields when both are empty", () => {
    expect(normalizeNames("   ", "")).toEqual({
      firstName: undefined,
      lastName: undefined,
      name: undefined,
    });
  });

  it("keeps a single provided name part", () => {
    expect(normalizeNames("Ada", "")).toEqual({
      firstName: "Ada",
      lastName: undefined,
      name: "Ada",
    });
    expect(normalizeNames("", "Lovelace")).toEqual({
      firstName: undefined,
      lastName: "Lovelace",
      name: "Lovelace",
    });
  });

  it("rejects overly long names", () => {
    const tooLong = "a".repeat(MAX_NAME_LENGTH + 1);
    expect(() => normalizeNames(tooLong, "X")).toThrow(/First name/);
    expect(() => normalizeNames("X", tooLong)).toThrow(/Last name/);
  });
});
