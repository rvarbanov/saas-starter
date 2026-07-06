import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getUserByTokenIdentifier } from "./lib/auth";
import { assertValidEmailFormat } from "./lib/email";
import { extractEmailFromIdentity, extractNameFromIdentity } from "./lib/identity";
import { upsertUserFromProfile } from "./lib/upsertUser";
import { assertEmailAvailable } from "./lib/users";

const storeResultValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
});

const authProfileValidator = v.object({
  tokenIdentifier: v.string(),
  workosUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
});

export const userDocValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
  tokenIdentifier: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  workosUserId: v.string(),
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
    workosUserId: user.workosUserId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Upsert when the WorkOS JWT already includes email (JWT template configured).
 * Prefer `usersActions.store` from the client when email is missing from the token.
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
      name: extractNameFromIdentity(identity),
    });
  },
});

/** Trusted profile upsert used by `usersActions.store` after WorkOS API lookup. */
export const upsertFromAuthProfile = internalMutation({
  args: authProfileValidator,
  returns: storeResultValidator,
  handler: async (ctx, args) => {
    assertValidEmailFormat(args.email);
    return await upsertUserFromProfile(ctx, args);
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
