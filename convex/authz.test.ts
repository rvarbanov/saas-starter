/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildSearchText } from "./lib/searchText";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = { subject: "caller", issuer: "https://example.test" };
const callerToken = "https://example.test|caller";

type RoleName = "SYS_ADM" | "USR_ADM" | "USR_MGR" | "USR_VWR" | "team_member";

function testClient() {
  return convexTest(schema, modules);
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  fields: {
    email: string;
    tokenIdentifier?: string;
    roles?: RoleName[];
    firstName?: string;
    lastName?: string;
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
      createdAt: 1,
      updatedAt: 1,
    });
  });
}

async function insertCaller(t: ReturnType<typeof convexTest>, roles: RoleName[]) {
  return await insertUser(t, {
    email: "caller@example.com",
    tokenIdentifier: callerToken,
    roles,
    firstName: "Call",
    lastName: "Er",
  });
}

describe("authz.can", () => {
  it("throws Not authenticated without a JWT", async () => {
    const t = testClient();
    await expect(t.query(api.authz.can, { domain: "users", action: "list" })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws the provisioning error when the JWT has no App user", async () => {
    const t = testClient();
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "users", action: "list" }),
    ).rejects.toThrow("complete sign-in provisioning");
  });

  it("returns false for a catalog pair the Role does not hold", async () => {
    const t = testClient();
    await insertCaller(t, ["USR_VWR"]);
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "users", action: "self.read" }),
    ).resolves.toBe(false);
  });

  it("allows Profile Actions for empty roles and denies Users Actions", async () => {
    const t = testClient();
    await insertCaller(t, []);
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "profile", action: "self.read" }),
    ).resolves.toBe(true);
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "users", action: "list" }),
    ).resolves.toBe(false);
  });

  it("allows team_member to write their Profile and denies Users list", async () => {
    const t = testClient();
    await insertCaller(t, ["team_member"]);
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "profile", action: "self.write" }),
    ).resolves.toBe(true);
    await expect(
      t.withIdentity(identity).query(api.authz.can, { domain: "users", action: "list" }),
    ).resolves.toBe(false);
  });
});

describe("users action gates", () => {
  it("denies USR_VWR create, update of someone else, delete, and changes.read", async () => {
    const t = testClient();
    await insertCaller(t, ["USR_VWR"]);
    const otherId = await insertUser(t, { email: "ada@example.com", firstName: "Ada" });

    await expect(
      t.withIdentity(identity).action(api.usersActions.createUser, {
        email: "new@example.com",
      }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.withIdentity(identity).action(api.usersActions.updateUser, {
        userId: otherId,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.withIdentity(identity).mutation(api.users.deleteUser, { userId: otherId }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.withIdentity(identity).query(api.changes.listForAppUser, {
        userId: otherId,
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("denies USR_MGR delete and allows create-path assert, update, and changes.read", async () => {
    const t = testClient();
    const callerId = await insertCaller(t, ["USR_MGR"]);
    const otherId = await insertUser(t, { email: "ada@example.com", firstName: "Ada" });

    await expect(
      t.withIdentity(identity).mutation(api.users.deleteUser, { userId: otherId }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.withIdentity(identity).query(internal.authz.assertCan, {
        domain: "users",
        action: "create",
      }),
    ).resolves.toBeNull();

    await expect(
      t.withIdentity(identity).action(api.usersActions.updateUser, {
        userId: otherId,
        firstName: "Augusta",
        lastName: "King",
        email: "ada@example.com",
      }),
    ).resolves.toMatchObject({ _id: otherId, firstName: "Augusta" });

    await expect(
      t.withIdentity(identity).query(api.changes.listForAppUser, {
        userId: otherId,
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).resolves.toMatchObject({ isDone: true });

    await expect(
      t.withIdentity(identity).action(api.usersActions.updateUser, {
        userId: callerId,
        firstName: "Call",
        lastName: "Er",
        email: "caller@example.com",
      }),
    ).resolves.toMatchObject({ _id: callerId, firstName: "Call" });
  });

  it("lets USR_ADM and SYS_ADM delete a non-System-admin and rejects a SYS_ADM subject", async () => {
    const t = testClient();
    await insertCaller(t, ["USR_ADM"]);
    const subjectId = await insertUser(t, { email: "ada@example.com", roles: ["team_member"] });
    const sysId = await insertUser(t, { email: "sys@example.com", roles: ["SYS_ADM"] });

    await expect(
      t.withIdentity(identity).mutation(api.users.deleteUser, { userId: sysId }),
    ).rejects.toThrow("Cannot delete a user who holds System admin");

    await expect(
      t.withIdentity(identity).mutation(api.users.deleteUser, { userId: subjectId }),
    ).resolves.toBeNull();

    const t2 = testClient();
    await insertCaller(t2, ["SYS_ADM"]);
    const otherId = await insertUser(t2, { email: "ada@example.com", roles: ["USR_VWR"] });
    const otherSys = await insertUser(t2, { email: "sys@example.com", roles: ["SYS_ADM"] });
    await expect(
      t2.withIdentity(identity).mutation(api.users.deleteUser, { userId: otherSys }),
    ).rejects.toThrow("Cannot delete a user who holds System admin");
    await expect(
      t2.withIdentity(identity).mutation(api.users.deleteUser, { userId: otherId }),
    ).resolves.toBeNull();
  });

  it("lets team_member update themselves and denies updating someone else", async () => {
    const t = testClient();
    const callerId = await insertCaller(t, ["team_member"]);
    const otherId = await insertUser(t, { email: "ada@example.com" });

    await expect(
      t.withIdentity(identity).action(api.usersActions.updateUser, {
        userId: callerId,
        firstName: "Pat",
        lastName: "",
        email: "caller@example.com",
      }),
    ).resolves.toMatchObject({ _id: callerId, firstName: "Pat" });

    await expect(
      t.withIdentity(identity).action(api.usersActions.updateUser, {
        userId: otherId,
        firstName: "Ada",
        lastName: "",
        email: "ada@example.com",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects a roles argument on createUser and updateUser", async () => {
    const t = testClient();
    const userId = await insertUser(t, { email: "ada@example.com" });
    await expect(
      t.action(api.usersActions.createUser, {
        email: "new@example.com",
        roles: ["SYS_ADM"],
      } as never),
    ).rejects.toThrow(/roles/);
    await expect(
      t.action(api.usersActions.updateUser, {
        userId,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        roles: ["USR_MGR"],
      } as never),
    ).rejects.toThrow(/roles/);
  });
});
