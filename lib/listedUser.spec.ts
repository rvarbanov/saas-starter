import { describe, expect, it } from "vitest";
import type { Doc } from "../convex/_generated/dataModel";
import { toListedUser } from "../convex/lib/listedUser";

function fakeUser(overrides: Partial<Doc<"users">> = {}): Doc<"users"> {
  return {
    _id: "jd7users000000000000000000" as Doc<"users">["_id"],
    _creationTime: 1,
    appUserId: "11111111-1111-4111-8111-111111111111",
    tokenIdentifier: "https://issuer|user_1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    workosUserId: "user_1",
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}

describe("toListedUser", () => {
  it("keeps Listed user fields and omits identity-link fields and name", () => {
    expect(toListedUser(fakeUser())).toEqual({
      _id: "jd7users000000000000000000",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      createdAt: 10,
      updatedAt: 20,
    });
  });

  it("omits missing name parts", () => {
    expect(
      toListedUser(
        fakeUser({
          firstName: undefined,
          lastName: undefined,
          name: undefined,
        }),
      ),
    ).toEqual({
      _id: "jd7users000000000000000000",
      email: "ada@example.com",
      createdAt: 10,
      updatedAt: 20,
    });
  });
});
