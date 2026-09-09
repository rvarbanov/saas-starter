import { describe, expect, it } from "vitest";
import { buildSearchText } from "./searchText";

describe("buildSearchText", () => {
  it("joins first name, last name, and email lowercased", () => {
    expect(
      buildSearchText({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "Ada@Example.com",
      }),
    ).toBe("ada lovelace ada@example.com");
  });

  it("omits missing or blank name parts", () => {
    expect(buildSearchText({ email: "solo@example.com" })).toBe("solo@example.com");
    expect(
      buildSearchText({
        firstName: "  ",
        lastName: "Lovelace",
        email: "a@b.co",
      }),
    ).toBe("lovelace a@b.co");
  });
});
