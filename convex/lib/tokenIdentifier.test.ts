import { describe, expect, it } from "vitest";
import { issuerFromTokenIdentifier, tokenIdentifierForCreatedUser } from "./tokenIdentifier";

describe("tokenIdentifierForCreatedUser", () => {
  it("reuses the creator issuer and the new WorkOS user id", () => {
    expect(tokenIdentifierForCreatedUser("https://api.workos.com/|user_creator", "user_new")).toBe(
      "https://api.workos.com/|user_new",
    );
  });

  it("keeps a path-style issuer intact", () => {
    expect(
      tokenIdentifierForCreatedUser(
        "https://api.workos.com/user_management/client_01abc|user_creator",
        "user_new",
      ),
    ).toBe("https://api.workos.com/user_management/client_01abc|user_new");
  });

  it("rejects a tokenIdentifier without an issuer/subject split", () => {
    expect(() => tokenIdentifierForCreatedUser("no-separator", "user_new")).toThrow(
      /Invalid creator token identifier/,
    );
  });
});

describe("issuerFromTokenIdentifier", () => {
  it("returns the issuer prefix", () => {
    expect(issuerFromTokenIdentifier("https://api.workos.com/|user_01abc")).toBe(
      "https://api.workos.com/",
    );
  });
});
