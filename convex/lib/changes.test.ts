/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { actorLabelFor, diffTrackedFields, formatChangeFields, recordChange } from "./changes";

const modules = import.meta.glob("../**/*.ts");

function testClient() {
  return convexTest(schema, modules);
}

describe("diffTrackedFields", () => {
  it("lists differing tracked fields in order", () => {
    expect(
      diffTrackedFields(
        {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          roles: ["manager"],
        },
        {
          firstName: "Augusta",
          lastName: "King",
          email: "king@example.com",
          roles: ["team_member"],
        },
      ),
    ).toEqual([
      { field: "firstName", before: "Ada", after: "Augusta" },
      { field: "lastName", before: "Lovelace", after: "King" },
      { field: "email", before: "ada@example.com", after: "king@example.com" },
      { field: "roles", before: "manager", after: "team_member" },
    ]);
  });

  it("treats blank and missing names as the same and ignores excluded fields", () => {
    const before = {
      firstName: "  ",
      lastName: undefined,
      email: "ada@example.com",
      roles: undefined,
      updatedAt: 1,
      createdAt: 1,
      tokenIdentifier: "old-token",
      workosUserId: "user_old",
      appUserId: "app-old",
      searchText: "old",
      deletedAt: 4,
    };
    const after = {
      ...before,
      firstName: "",
      lastName: undefined,
      roles: [] as Array<"manager">,
      updatedAt: 9,
      createdAt: 2,
      tokenIdentifier: "new-token",
      workosUserId: "user_new",
      appUserId: "app-new",
      searchText: "new",
      deletedAt: 8,
    };

    expect(diffTrackedFields(before, after)).toEqual([]);
  });

  it("treats duplicate roles and an empty set as no difference", () => {
    expect(diffTrackedFields({ roles: ["manager", "manager"] }, { roles: ["manager"] })).toEqual(
      [],
    );
    expect(diffTrackedFields({ roles: undefined }, { roles: [] })).toEqual([]);
  });

  it("records a role order change", () => {
    expect(
      diffTrackedFields(
        { roles: ["manager", "team_member"] },
        { roles: ["team_member", "manager"] },
      ),
    ).toEqual([
      {
        field: "roles",
        before: "manager, team_member",
        after: "team_member, manager",
      },
    ]);
  });
});

describe("formatChangeFields and actor labels", () => {
  it("renders empty names as an em dash and empty roles as None", () => {
    expect(
      formatChangeFields([
        { field: "firstName", before: null, after: "Ada" },
        { field: "email", before: "ada@example.com", after: "new@example.com" },
        { field: "roles", before: null, after: "manager, team_member" },
      ]),
    ).toEqual([
      { label: "First name", before: "—", after: "Ada" },
      { label: "Email", before: "ada@example.com", after: "new@example.com" },
      { label: "Roles", before: "None", after: "Manager, Team member" },
    ]);
  });

  it("labels system, deleted, and current actors", () => {
    expect(actorLabelFor("system", null)).toBe("System");
    expect(actorLabelFor("user", null)).toBe("Deleted user");
    expect(actorLabelFor("user", { deletedAt: 1, email: "gone@example.com" })).toBe("Deleted user");
    expect(
      actorLabelFor("user", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    ).toBe("Ada Lovelace");
    expect(actorLabelFor("user", { email: "ada@example.com" })).toBe("ada@example.com");
  });
});

describe("recordChange", () => {
  async function insertSubject(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        appUserId: crypto.randomUUID(),
        tokenIdentifier: "https://example.test|subject",
        email: "subject@example.com",
        workosUserId: "subject",
        searchText: "subject@example.com",
        createdAt: 1,
        updatedAt: 1,
      });
    });
  }

  it("does not insert when an update has no tracked diff", async () => {
    const t = testClient();
    const subjectId = await insertSubject(t);

    await t.run(async (ctx) => {
      await recordChange(ctx, {
        subjectId,
        action: "update",
        actor: { kind: "system" },
        at: 2,
        fields: [],
      });
    });

    const rows = await t.run(async (ctx) => {
      return await ctx.db.query("changes").collect();
    });
    expect(rows).toEqual([]);
  });

  it("rejects a user actor without an id and a system actor with an id", async () => {
    const t = testClient();
    const subjectId = await insertSubject(t);

    await expect(
      t.run(async (ctx) => {
        await recordChange(ctx, {
          subjectId,
          action: "create",
          actor: { kind: "user" } as { kind: "user"; userId: Id<"users"> },
          at: 2,
          fields: [],
        });
      }),
    ).rejects.toThrow("User actor requires an App user id");

    await expect(
      t.run(async (ctx) => {
        await recordChange(ctx, {
          subjectId,
          action: "delete",
          actor: { kind: "system", userId: subjectId } as { kind: "system" },
          at: 3,
          fields: [],
        });
      }),
    ).rejects.toThrow("System actor must not include an App user id");

    const rows = await t.run(async (ctx) => {
      return await ctx.db.query("changes").collect();
    });
    expect(rows).toEqual([]);
  });

  it("inserts a create with an empty field list for a user actor", async () => {
    const t = testClient();
    const subjectId = await insertSubject(t);

    await t.run(async (ctx) => {
      await recordChange(ctx, {
        subjectId,
        action: "create",
        actor: { kind: "user", userId: subjectId },
        at: 5,
        fields: [{ field: "email", before: null, after: "ignored@example.com" }],
      });
    });

    const rows = await t.run(async (ctx) => {
      return await ctx.db.query("changes").collect();
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      resourceKind: "app_user",
      subjectId,
      action: "create",
      actorKind: "user",
      actorUserId: subjectId,
      at: 5,
      fields: [],
    });
  });
});
