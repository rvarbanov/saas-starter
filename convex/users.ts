import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./lib/auth";
import { diffTrackedFields, recordChange } from "./lib/changes";
import { assertValidEmailFormat } from "./lib/email";
import { extractEmailFromIdentity } from "./lib/identity";
import { listUsersPageValidator, toListUser } from "./lib/listUser";
import { clampPaginationNumItems } from "./lib/pagination";
import { requireCan } from "./lib/requireCan";
import {
  hasAnyRole,
  hasRole,
  type Role,
  rolesValidator,
  stripTeamMemberRoleCode,
  uniqueRoles,
} from "./lib/roles";
import { buildSearchText } from "./lib/searchText";
import { upsertUserFromProfile } from "./lib/upsertUser";
import { meUserValidator, toMeUser, toPublicUserDoc, userDocValidator } from "./lib/userDoc";
import { normalizeNames } from "./lib/userNames";
import { assertEmailAvailable } from "./lib/users";

export { toPublicUserDoc, userDocValidator } from "./lib/userDoc";

const createdWithinDaysValidator = v.union(v.literal(7), v.literal(30), v.literal(90));

function normalizeListSearch(search: string | undefined): string | undefined {
  if (search === undefined) {
    return undefined;
  }
  const trimmed = search.trim();
  return trimmed.length >= 2 ? trimmed : undefined;
}

function matchesListFilters(
  user: Doc<"users">,
  filters: {
    roles: Role[] | undefined;
    createdWithinDays: 7 | 30 | 90 | undefined;
    now: number;
  },
): boolean {
  if (user.deletedAt !== undefined) {
    return false;
  }
  if (filters.roles !== undefined && filters.roles.length > 0) {
    if (!hasAnyRole(user.roles, filters.roles)) {
      return false;
    }
  }
  if (filters.createdWithinDays !== undefined) {
    const cutoff = filters.now - filters.createdWithinDays * 24 * 60 * 60 * 1000;
    if (user.createdAt < cutoff) {
      return false;
    }
  }
  return true;
}

const storeResultValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
});

const authProfileValidator = v.object({
  tokenIdentifier: v.string(),
  workosUserId: v.string(),
  email: v.string(),
});

/**
 * Upsert when the WorkOS JWT already includes email (JWT template configured).
 * Prefer `usersActions.provisionUser` from the client when email is missing from the token.
 * Does not seed name fields from WorkOS/JWT — names are Convex-owned via `updateUser`.
 */
export const store = mutation({
  args: {},
  returns: storeResultValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const rawEmail = extractEmailFromIdentity(identity);
    if (!rawEmail) {
      throw new Error(
        "Email missing from auth token; client should call usersActions.provisionUser instead",
      );
    }

    const workosUserId = identity.subject;
    if (!workosUserId) {
      throw new Error("WorkOS user id required to provision user");
    }

    assertValidEmailFormat(rawEmail);

    return await upsertUserFromProfile(ctx, {
      tokenIdentifier: identity.tokenIdentifier,
      workosUserId,
      email: rawEmail,
    });
  },
});

/** Trusted profile upsert used by `usersActions.provisionUser` after WorkOS API email lookup. */
export const upsertFromAuthProfile = internalMutation({
  args: authProfileValidator,
  returns: storeResultValidator,
  handler: async (ctx, args) => {
    assertValidEmailFormat(args.email);
    return await upsertUserFromProfile(ctx, args);
  },
});

/**
 * Paginated Users list. Requires `users.list`.
 * Sort is `updatedAt` descending when not searching; search relevance when searching.
 * Optional `search` / `roles` / `createdWithinDays` are AND-combined (server-side).
 * Role/date filters may yield sparse pages. `numItems` is silently capped at 100.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    roles: v.optional(rolesValidator),
    createdWithinDays: v.optional(createdWithinDaysValidator),
  },
  returns: listUsersPageValidator,
  handler: async (ctx, args) => {
    await requireCan(ctx, { domain: "users", action: "list" });

    const paginationOpts = {
      ...args.paginationOpts,
      numItems: clampPaginationNumItems(args.paginationOpts.numItems),
    };
    const search = normalizeListSearch(args.search);
    const now = Date.now();
    const filters = {
      roles: args.roles,
      createdWithinDays: args.createdWithinDays,
      now,
    };

    const result =
      search !== undefined
        ? await ctx.db
            .query("users")
            .withSearchIndex("search_text", (q) => q.search("searchText", search))
            .paginate(paginationOpts)
        : await ctx.db
            .query("users")
            .withIndex("by_updatedAt")
            .order("desc")
            .paginate(paginationOpts);

    const page = result.page.filter((user) => matchesListFilters(user, filters));

    return {
      page: page.map(toListUser),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * User detail read: full public App user doc.
 * Requires `users.read`. Missing or soft-deleted row returns null (does not throw).
 * Listed-user floor remains on `api.users.list` only.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args) => {
    await requireCan(ctx, { domain: "users", action: "read" });
    const user = await ctx.db.get("users", args.userId);
    if (!user || user.deletedAt !== undefined) {
      return null;
    }
    return toPublicUserDoc(user);
  },
});

/**
 * Soft-delete an App user. Requires `users.delete`. Not yourself.
 * A subject who holds `SYS_ADM` cannot be deleted until that Role is removed
 * via internal `setRoles`. Sets `deletedAt` and leaves the row. Does not call WorkOS.
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caller = await requireCan(ctx, { domain: "users", action: "delete" });

    const target = await ctx.db.get("users", args.userId);
    if (!target || target.deletedAt !== undefined) {
      throw new Error("User not found");
    }

    if (args.userId === caller._id) {
      throw new Error("Cannot delete your own user");
    }
    if (hasRole(target.roles, "SYS_ADM")) {
      throw new Error("Cannot delete a user who holds System admin");
    }

    const now = Date.now();
    await ctx.db.patch("users", args.userId, {
      deletedAt: now,
      updatedAt: now,
    });
    await recordChange(ctx, {
      subjectId: args.userId,
      action: "delete",
      actor: { kind: "user", userId: caller._id },
      at: now,
      fields: [],
    });
    return null;
  },
});

/**
 * Profile floor for every caller: names, email, roles, and `_id`.
 * Null when unauthenticated or not provisioned yet. Identity-link fields stay on `getById`.
 */
export const getMe = query({
  args: {},
  returns: v.union(v.null(), meUserValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user ? toMeUser(user) : null;
  },
});

/**
 * Replace the role set for a user (v1 manual assignment).
 * Call from the Convex dashboard / scripts — not exposed to clients.
 */
export const setRoles = internalMutation({
  args: {
    userId: v.id("users"),
    roles: rolesValidator,
    actorUserId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const actor =
      args.actorUserId !== undefined
        ? { kind: "user" as const, userId: args.actorUserId }
        : { kind: "system" as const };
    if (actor.kind === "user") {
      const actorUser = await ctx.db.get("users", actor.userId);
      if (!actorUser) {
        throw new Error("User not found");
      }
    }

    const roles = uniqueRoles(args.roles);
    const fields = diffTrackedFields(
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
      },
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
      },
    );
    const now = Date.now();
    await ctx.db.patch("users", args.userId, {
      roles,
      updatedAt: now,
    });
    await recordChange(ctx, {
      subjectId: args.userId,
      action: "update",
      actor,
      at: now,
      fields,
    });
    return null;
  },
});

/** Validate and normalize email for authenticated actions. */
export const normalizeEmailForAction = internalQuery({
  args: {
    email: v.string(),
    excludeUserId: v.optional(v.id("users")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await assertEmailAvailable(ctx, args.email, args.excludeUserId);
  },
});

/** Signed-in App user for actions that record a Change. The client never sends the actor. */
export const getCallerIdForAction = internalQuery({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return user._id;
  },
});

/** Load user by Convex id for authenticated actions. */
export const getUserByIdForAction = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    return user ? toPublicUserDoc(user) : null;
  },
});

/**
 * Patch names and email after `updateUser` validation (and optional WorkOS email update).
 * Does not write roles. Blank names store unset, not `""`.
 */
export const patchUserDetailInternal = internalMutation({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    actorUserId: v.id("users"),
  },
  returns: userDocValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedNames = normalizeNames(args.firstName, args.lastName);
    const normalizedEmail = await assertEmailAvailable(ctx, args.email, args.userId);
    const fields = diffTrackedFields(
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
      },
      {
        firstName: normalizedNames.firstName,
        lastName: normalizedNames.lastName,
        email: normalizedEmail,
        roles: user.roles,
      },
    );
    const now = Date.now();

    await ctx.db.patch("users", args.userId, {
      firstName: normalizedNames.firstName,
      lastName: normalizedNames.lastName,
      email: normalizedEmail,
      searchText: buildSearchText({
        firstName: normalizedNames.firstName,
        lastName: normalizedNames.lastName,
        email: normalizedEmail,
      }),
      updatedAt: now,
    });
    await recordChange(ctx, {
      subjectId: args.userId,
      action: "update",
      actor: { kind: "user", userId: args.actorUserId },
      at: now,
      fields,
    });

    const updated = await ctx.db.get("users", args.userId);
    if (!updated) {
      throw new Error("User not found");
    }
    return toPublicUserDoc(updated);
  },
});

/**
 * Insert a manager-created App user after WorkOS `createUser` succeeds.
 * Auth-link fields are required. New App users get `roles: []`.
 */
export const insertCreatedUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    workosUserId: v.string(),
    tokenIdentifier: v.string(),
    actorUserId: v.id("users"),
  },
  returns: userDocValidator,
  handler: async (ctx, args) => {
    const normalizedNames = normalizeNames(args.firstName ?? "", args.lastName ?? "");
    const normalizedEmail = await assertEmailAvailable(ctx, args.email);
    const now = Date.now();
    const appUserId = crypto.randomUUID();

    const userId = await ctx.db.insert("users", {
      appUserId,
      tokenIdentifier: args.tokenIdentifier,
      email: normalizedEmail,
      workosUserId: args.workosUserId,
      ...(normalizedNames.firstName !== undefined ? { firstName: normalizedNames.firstName } : {}),
      ...(normalizedNames.lastName !== undefined ? { lastName: normalizedNames.lastName } : {}),
      roles: [],
      searchText: buildSearchText({
        firstName: normalizedNames.firstName,
        lastName: normalizedNames.lastName,
        email: normalizedEmail,
      }),
      createdAt: now,
      updatedAt: now,
    });

    await recordChange(ctx, {
      subjectId: userId,
      action: "create",
      actor: { kind: "user", userId: args.actorUserId },
      at: now,
      fields: [],
    });

    const created = await ctx.db.get("users", userId);
    if (!created) {
      throw new Error("User not found");
    }
    return toPublicUserDoc(created);
  },
});

/**
 * Backfill `searchText` on existing users (idempotent, batched).
 * Run via `npx convex run users:backfillSearchText` until `isDone`.
 */
export const backfillSearchText = internalMutation({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    patched: v.number(),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("users").paginate({
      ...args.paginationOpts,
      numItems: clampPaginationNumItems(args.paginationOpts.numItems),
    });

    let patched = 0;
    for (const user of result.page) {
      const searchText = buildSearchText({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      if (user.searchText !== searchText) {
        await ctx.db.patch("users", user._id, { searchText });
        patched += 1;
      }
    }

    return {
      patched,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Strip legacy `team_member` from every App user's roles (including soft-deleted).
 * Writes a system Change when the array changes. Run until `isDone` before
 * deploying a schema that drops `team_member` from the Role union.
 * Driver: `pnpm convex:strip-team-member-roles`.
 */
export const stripTeamMemberRoles = internalMutation({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    patched: v.number(),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("users").paginate({
      ...args.paginationOpts,
      numItems: clampPaginationNumItems(args.paginationOpts.numItems),
    });

    let patched = 0;
    for (const user of result.page) {
      const strip = stripTeamMemberRoleCode(user.roles as readonly string[] | undefined);
      if (!strip.changed) {
        continue;
      }
      const now = Date.now();
      await ctx.db.patch("users", user._id, {
        roles: strip.roles,
        updatedAt: now,
      });
      await recordChange(ctx, {
        subjectId: user._id,
        action: "update",
        actor: { kind: "system" },
        at: now,
        fields: [
          {
            field: "roles",
            before: strip.beforeLiteral,
            after: strip.afterLiteral,
          },
        ],
      });
      patched += 1;
    }

    return {
      patched,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});
