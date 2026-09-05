import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getCurrentUserOrThrow,
  getUserByTokenIdentifier,
  requireIdentity,
} from "./lib/auth";
import { assertValidEmailFormat } from "./lib/email";
import { extractEmailFromIdentity } from "./lib/identity";
import { listUserValidator, listUsersPageValidator, toListUser } from "./lib/listUser";
import { clampPaginationNumItems } from "./lib/pagination";
import { hasAnyRole, normalizeRoles, type Role, rolesValidator, uniqueRoles } from "./lib/roles";
import { buildSearchText } from "./lib/searchText";
import { upsertUserFromProfile } from "./lib/upsertUser";
import { normalizeNames } from "./lib/userNames";
import { assertEmailAvailable } from "./lib/users";

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

export const userDocValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
  tokenIdentifier: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  workosUserId: v.string(),
  /** Always present on the public self DTO; empty when none assigned. */
  roles: rolesValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

function toPublicUserDoc(user: Doc<"users">) {
  return {
    _id: user._id,
    appUserId: user.appUserId,
    tokenIdentifier: user.tokenIdentifier,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    workosUserId: user.workosUserId,
    roles: normalizeRoles(user.roles),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Upsert when the WorkOS JWT already includes email (JWT template configured).
 * Prefer `usersActions.provisionUser` from the client when email is missing from the token.
 * Does not seed name fields from WorkOS/JWT — names are Convex-owned via `updateName`.
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
 * Listed user by id. JWT required; missing row returns null (does not throw).
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(listUserValidator, v.null()),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const user = await ctx.db.get("users", args.userId);
    return user ? toListUser(user) : null;
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

/**
 * Update the authenticated user's first and last name in Convex only.
 * Does not call WorkOS.
 */
export const updateName = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const normalized = normalizeNames(args.firstName, args.lastName);

    const firstName = normalized.firstName;
    const lastName = normalized.lastName;
    const name = normalized.name;

    const unchanged =
      user.firstName === firstName && user.lastName === lastName && user.name === name;
    if (unchanged) {
      return null;
    }

    await ctx.db.patch("users", user._id, {
      firstName,
      lastName,
      name,
      searchText: buildSearchText({ firstName, lastName, email: user.email }),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Load user by token for authenticated actions (actions cannot access the database directly). */
export const getUserByTokenForAction = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx, args) => {
    const user = await getUserByTokenIdentifier(ctx, args.tokenIdentifier);
    return user ? toPublicUserDoc(user) : null;
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

/**
 * Patch email after WorkOS User Management API update.
 * Called from `usersActions.updateEmail` with a server-verified tokenIdentifier.
 */
export const patchEmailInternal = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByTokenIdentifier(ctx, args.tokenIdentifier);
    if (!user) {
      throw new Error("User not found; complete sign-in provisioning");
    }

    const normalized = await assertEmailAvailable(ctx, args.email, user._id);
    if (user.email === normalized) {
      return null;
    }

    await ctx.db.patch("users", user._id, {
      email: normalized,
      searchText: buildSearchText({
        firstName: user.firstName,
        lastName: user.lastName,
        email: normalized,
      }),
      updatedAt: Date.now(),
    });
    return null;
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
