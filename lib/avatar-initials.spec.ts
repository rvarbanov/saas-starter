import { describe, expect, it } from "vitest";
import { avatarDisplayName, avatarInitials } from "./avatar-initials";

describe("avatarInitials", () => {
  it("uses first and last name", () => {
    expect(avatarInitials({ firstName: "Ada", lastName: "Lovelace" })).toBe("AL");
  });

  it("falls back to combined name", () => {
    expect(avatarInitials({ name: "Ada Lovelace" })).toBe("AL");
  });

  it("falls back to email local-part", () => {
    expect(avatarInitials({ email: "ada@example.com" })).toBe("A");
  });

  it("uses ? when nothing is present", () => {
    expect(avatarInitials({})).toBe("?");
  });
});

describe("avatarDisplayName", () => {
  it("joins first and last", () => {
    expect(avatarDisplayName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("omits name when missing", () => {
    expect(avatarDisplayName({})).toBeUndefined();
  });
});
