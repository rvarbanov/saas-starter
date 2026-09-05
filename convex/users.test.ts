/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildSearchText } from "./lib/searchText";
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
    tokenIdentifier?: string;
    roles?: Array<"super_admin" | "manager" | "team_member">;
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      appUserId: crypto.randomUUID(),
      tokenIdentifier: fields.tokenIdentifier ?? `https://example.test|${fields.email}`,
      email: fields.email,
      workosUserId: fields.email,
      ...(fields.firstName !== undefined ? { firstName: fields.firstName } : {}),
      ...(fields.lastName !== undefined ? { lastName: fields.lastName } : {}),
      ...(fields.roles !== undefined ? { roles: fields.roles } : {}),
      searchText: buildSearchText({
        firstName: fields.firstName,
        lastName: fields.lastName,
        email: fields.email,
      }),
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

  it("returns Listed users newest updatedAt first with roles and omits identity fields", async () => {
    const t = testClient();
    await insertUser(t, { email: "old@example.com", updatedAt: 1, firstName: "Old" });
    await insertUser(t, {
      email: "new@example.com",
      updatedAt: 3,
      firstName: "New",
      lastName: "User",
      roles: ["manager"],
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
      roles: ["manager"],
      createdAt: 3,
      updatedAt: 3,
    });
    expect(result.page[1]?.roles).toEqual([]);
    expect(result.page[0]).not.toHaveProperty("tokenIdentifier");
    expect(result.page[0]).not.toHaveProperty("workosUserId");
    expect(result.page[0]).not.toHaveProperty("appUserId");
    expect(result.page[0]).not.toHaveProperty("name");
    expect(result.page[0]).not.toHaveProperty("searchText");
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

  it("ignores search queries shorter than 2 characters", async () => {
    const t = testClient();
    await insertUser(t, { email: "ada@example.com", updatedAt: 2, firstName: "Ada" });
    await insertUser(t, { email: "other@example.com", updatedAt: 1, firstName: "Other" });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
      search: "a",
    });

    expect(result.page.map((user) => user.email)).toEqual(["ada@example.com", "other@example.com"]);
  });

  it("searches by name/email via searchText", async () => {
    const t = testClient();
    await insertUser(t, {
      email: "ada@example.com",
      updatedAt: 1,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    await insertUser(t, {
      email: "grace@example.com",
      updatedAt: 2,
      firstName: "Grace",
      lastName: "Hopper",
    });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
      search: "lovelace",
    });

    expect(result.page.map((user) => user.email)).toEqual(["ada@example.com"]);
  });

  it("filters by role has-any", async () => {
    const t = testClient();
    await insertUser(t, {
      email: "admin@example.com",
      updatedAt: 3,
      roles: ["super_admin"],
    });
    await insertUser(t, {
      email: "mgr@example.com",
      updatedAt: 2,
      roles: ["manager", "team_member"],
    });
    await insertUser(t, {
      email: "none@example.com",
      updatedAt: 1,
      roles: [],
    });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
      roles: ["manager"],
    });

    expect(result.page.map((user) => user.email)).toEqual(["mgr@example.com"]);
  });

  it("filters by createdWithinDays", async () => {
    const t = testClient();
    const now = Date.now();
    await insertUser(t, {
      email: "fresh@example.com",
      updatedAt: now,
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
    });
    await insertUser(t, {
      email: "stale@example.com",
      updatedAt: now - 1,
      createdAt: now - 40 * 24 * 60 * 60 * 1000,
    });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
      createdWithinDays: 7,
    });

    expect(result.page.map((user) => user.email)).toEqual(["fresh@example.com"]);
  });

  it("AND-combines search and role filters", async () => {
    const t = testClient();
    await insertUser(t, {
      email: "ada.manager@example.com",
      updatedAt: 3,
      firstName: "Ada",
      roles: ["manager"],
    });
    await insertUser(t, {
      email: "ada.admin@example.com",
      updatedAt: 2,
      firstName: "Ada",
      roles: ["super_admin"],
    });
    await insertUser(t, {
      email: "grace.manager@example.com",
      updatedAt: 1,
      firstName: "Grace",
      roles: ["manager"],
    });

    const result = await t.withIdentity(identity).query(api.users.list, {
      paginationOpts: { numItems: 25, cursor: null },
      search: "ada",
      roles: ["manager"],
    });

    expect(result.page.map((user) => user.email)).toEqual(["ada.manager@example.com"]);
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
        searchText: buildSearchText({ email: "gone@example.com" }),
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.delete("users", id);
      return id;
    });

    await expect(t.withIdentity(identity).query(api.users.getById, { userId })).resolves.toBeNull();
  });

  it("returns a Listed user by id including roles", async () => {
    const t = testClient();
    const userId = await insertUser(t, {
      email: "ada@example.com",
      updatedAt: 5,
      createdAt: 4,
      firstName: "Ada",
      roles: ["team_member"],
    });

    await expect(t.withIdentity(identity).query(api.users.getById, { userId })).resolves.toEqual({
      _id: userId,
      firstName: "Ada",
      email: "ada@example.com",
      roles: ["team_member"],
      createdAt: 4,
      updatedAt: 5,
    });
  });
});

describe("users.getMe + roles", () => {
  it("returns null when unauthenticated", async () => {
    const t = testClient();
    await expect(t.query(api.users.getMe, {})).resolves.toBeNull();
  });

  it("returns empty roles when none are assigned", async () => {
    const t = testClient();
    await insertUser(t, {
      email: "me@example.com",
      updatedAt: 1,
      tokenIdentifier: "https://example.test|caller",
    });

    const me = await t.withIdentity(identity).query(api.users.getMe, {});
    expect(me?.email).toBe("me@example.com");
    expect(me?.roles).toEqual([]);
  });

  it("returns roles after internal setRoles (multi-role)", async () => {
    const t = testClient();
    const userId = await insertUser(t, {
      email: "admin@example.com",
      updatedAt: 1,
      tokenIdentifier: "https://example.test|caller",
      roles: [],
    });

    await t.mutation(internal.users.setRoles, {
      userId,
      roles: ["super_admin", "manager", "super_admin"],
    });

    const me = await t.withIdentity(identity).query(api.users.getMe, {});
    expect(me?.roles).toEqual(["super_admin", "manager"]);
  });
});
