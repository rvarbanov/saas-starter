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
import { normalizeRoles, rolesValidator, uniqueRoles } from "./lib/roles";
import { upsertUserFromProfile } from "./lib/upsertUser";
import { normalizeNames } from "./lib/userNames";
import { assertEmailAvailable } from "./lib/users";

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
 * Sort is fixed `updatedAt` descending. `numItems` is silently capped at 100.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: listUsersPageValidator,
  handler: async (ctx, args) => {
    await requireIdentity(ctx);

    const result = await ctx.db
      .query("users")
      .withIndex("by_updatedAt")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: clampPaginationNumItems(args.paginationOpts.numItems),
      });

    return {
      page: result.page.map(toListUser),
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
      updatedAt: Date.now(),
    });
    return null;
  },
});
