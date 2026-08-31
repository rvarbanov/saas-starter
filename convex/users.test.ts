/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = { subject: "caller", issuer: "https://example.test" };

function testClient() {
  return convexTest(schema, modules);
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: {
    email: string;
    updatedAt: number;
    createdAt?: number;
    firstName?: string;
    lastName?: string;
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      appUserId: crypto.randomUUID(),
      tokenIdentifier: `https://example.test|${fields.email}`,
      email: fields.email,
      workosUserId: fields.email,
      ...(fields.firstName !== undefined ? { firstName: fields.firstName } : {}),
      ...(fields.lastName !== undefined ? { lastName: fields.lastName } : {}),
      createdAt: fields.createdAt ?? fields.updatedAt,
      updatedAt: fields.updatedAt,
    });
  });
}

describe("users.list", () => {
  it("throws Not authenticated without a JWT", async () => {
    const t = testClient();
    await expect(
      t.query(api.users.list, { paginationOpts: { numItems: 25, cursor: null } }),
    ).rejects.toThrow("Not authenticated");
  });

  it("returns Listed users newest updatedAt first and omits identity fields", async () => {
    const t = testClient();
    await insertUser(t, { email: "old@example.com", updatedAt: 1, firstName: "Old" });
    await insertUser(t, {
      email: "new@example.com",
      updatedAt: 3,
      firstName: "New",
      lastName: "User",
    });
    await insertUser(t, { email: "mid@example.com", updatedAt: 2 });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
    });

    expect(result.page.map((user) => user.email)).toEqual([
      "new@example.com",
      "mid@example.com",
      "old@example.com",
    ]);
    expect(result.page[0]).toEqual({
      _id: result.page[0]?._id,
      firstName: "New",
      lastName: "User",
      email: "new@example.com",
      createdAt: 3,
      updatedAt: 3,
    });
    expect(result.page[0]).not.toHaveProperty("tokenIdentifier");
    expect(result.page[0]).not.toHaveProperty("workosUserId");
    expect(result.page[0]).not.toHaveProperty("appUserId");
    expect(result.page[0]).not.toHaveProperty("name");
    expect(result.isDone).toBe(true);
  });

  it("silently clamps numItems to 100", async () => {
    const t = testClient();
    for (let i = 0; i < 101; i += 1) {
      await insertUser(t, { email: `user${i}@example.com`, updatedAt: i });
    }

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 200, cursor: null },
    });

    expect(result.page).toHaveLength(100);
    expect(result.isDone).toBe(false);
  });
});

describe("users.getById", () => {
  it("throws Not authenticated without a JWT", async () => {
    const t = testClient();
    const userId = await insertUser(t, { email: "ada@example.com", updatedAt: 1 });
    await expect(t.query(api.users.getById, { userId })).rejects.toThrow("Not authenticated");
  });

  it("returns null when the user is missing", async () => {
    const t = testClient();
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        appUserId: crypto.randomUUID(),
        tokenIdentifier: "https://example.test|gone",
        email: "gone@example.com",
        workosUserId: "gone",
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.delete("users", id);
      return id;
    });

    await expect(t.withIdentity(identity).query(api.users.getById, { userId })).resolves.toBeNull();
  });

  it("returns a Listed user by id", async () => {
    const t = testClient();
    const userId = await insertUser(t, {
      email: "ada@example.com",
      updatedAt: 5,
      createdAt: 4,
      firstName: "Ada",
    });

    await expect(t.withIdentity(identity).query(api.users.getById, { userId })).resolves.toEqual({
      _id: userId,
      firstName: "Ada",
      email: "ada@example.com",
      createdAt: 4,
      updatedAt: 5,
    });
  });
});
