import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow, requireIdentity } from "./lib/auth";
import { assertValidEmailFormat } from "./lib/email";
import { extractEmailFromIdentity } from "./lib/identity";
import { listUsersPageValidator, toListUser } from "./lib/listUser";
import { clampPaginationNumItems } from "./lib/pagination";
import { hasAnyRole, isSuperAdmin, type Role, rolesValidator, uniqueRoles } from "./lib/roles";
import { buildSearchText } from "./lib/searchText";
import { upsertUserFromProfile } from "./lib/upsertUser";
import { toPublicUserDoc, userDocValidator } from "./lib/userDoc";
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
 * Paginated Users list. JWT required; caller need not have a Convex `users` row.
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
    await requireIdentity(ctx);

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
 * User detail read: full public App user doc (same shape as `getMe`).
 * JWT required; missing row returns null (does not throw).
 * Listed-user floor remains on `api.users.list` only.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user || user.deletedAt !== undefined) {
      return null;
    }
    return toPublicUserDoc(user);
  },
});

const SUPER_ADMIN_COUNT_PAGE_SIZE = 100;

/** Count Super admins who are not soft-deleted. Paginate; do not collect the table. */
async function countActiveSuperAdmins(ctx: MutationCtx): Promise<number> {
  let count = 0;
  let cursor: string | null = null;
  let isDone = false;
  while (!isDone) {
    const result = await ctx.db.query("users").withIndex("by_updatedAt").paginate({
      numItems: SUPER_ADMIN_COUNT_PAGE_SIZE,
      cursor,
    });
    for (const user of result.page) {
      if (user.deletedAt === undefined && isSuperAdmin(user.roles)) {
        count += 1;
      }
    }
    cursor = result.continueCursor;
    isDone = result.isDone;
  }
  return count;
}

/**
 * Soft-delete an App user. Super admin only, not yourself, not the last Super admin.
 * Sets `deletedAt` and leaves the row. Does not call WorkOS.
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);

    const target = await ctx.db.get("users", args.userId);
    if (!target || target.deletedAt !== undefined) {
      throw new Error("User not found");
    }

    const caller = await getCurrentUserOrThrow(ctx);
    if (!isSuperAdmin(caller.roles)) {
      throw new Error("Unauthorized");
    }
    if (args.userId === caller._id) {
      throw new Error("Cannot delete your own user");
    }
    if (isSuperAdmin(target.roles)) {
      const activeSuperAdmins = await countActiveSuperAdmins(ctx);
      if (activeSuperAdmins === 1) {
        throw new Error("Cannot delete the last Super admin");
      }
    }

    const now = Date.now();
    await ctx.db.patch("users", args.userId, {
      deletedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

/** Return the current user's Convex record, or null when unauthenticated / not provisioned yet. */
export const getMe = query({
  args: {},
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user ? toPublicUserDoc(user) : null;
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const roles = uniqueRoles(args.roles);
    await ctx.db.patch("users", args.userId, {
      roles,
      updatedAt: Date.now(),
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
  },
  returns: userDocValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedNames = normalizeNames(args.firstName, args.lastName);
    const normalizedEmail = await assertEmailAvailable(ctx, args.email, args.userId);

    await ctx.db.patch("users", args.userId, {
      firstName: normalizedNames.firstName,
      lastName: normalizedNames.lastName,
      email: normalizedEmail,
      searchText: buildSearchText({
        firstName: normalizedNames.firstName,
        lastName: normalizedNames.lastName,
        email: normalizedEmail,
      }),
      updatedAt: Date.now(),
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
 * Unset the legacy combined `name` on every App user, including deleted rows.
 * Idempotent and batched. Run via `npx convex run users:stripStoredName` until `isDone`.
 */
export const stripStoredName = internalMutation({
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
      if (user.name !== undefined) {
        await ctx.db.patch("users", user._id, { name: undefined });
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
