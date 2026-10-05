"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { extractEmailFromIdentity } from "./lib/identity";
import { issuerFromTokenIdentifier, tokenIdentifierForCreatedUser } from "./lib/tokenIdentifier";
import { userDocValidator } from "./lib/userDoc";
import { normalizeNames } from "./lib/userNames";
import {
  CREATE_USER_FAILED,
  createWorkOsUser,
  deleteWorkOsUser,
  EMAIL_SYNC_FAILED,
  EMAIL_UPDATE_FAILED,
  fetchWorkOsUserProfile,
  mapCreateUserError,
  sendWorkOsInvitation,
  updateWorkOsUserEmail,
} from "./lib/workosApi";

const storeResultValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
});

/** True when the App user has a WorkOS sign-in we can update. */
function hasWorkOsIntegration(workosUserId: string | undefined): boolean {
  return typeof workosUserId === "string" && workosUserId.trim().length > 0;
}

/**
 * Provision the signed-in user in Convex. Fetches email from WorkOS when the
 * access token JWT does not include an `email` claim (default AuthKit behavior).
 * Does not copy name fields from WorkOS — names are Convex-owned.
 */
export const provisionUser = action({
  args: {},
  returns: storeResultValidator,
  handler: async (ctx): Promise<{ _id: Id<"users">; appUserId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workosUserId = identity.subject;
    if (!workosUserId) {
      throw new Error("WorkOS user id required to provision user");
    }

    let email = extractEmailFromIdentity(identity);

    if (!email) {
      const profile = await fetchWorkOsUserProfile(workosUserId);
      email = profile.email;
    }

    if (!email) {
      throw new Error("Email required to provision user");
    }

    return await ctx.runMutation(internal.users.upsertFromAuthProfile, {
      tokenIdentifier: identity.tokenIdentifier,
      workosUserId,
      email,
    });
  },
});

/**
 * Full-form replace of names and email for an App user (Edit User and Profile).
 * Does not write roles. WorkOS receives email only, and only when it changed.
 * If the Convex patch fails after that PUT, the previous email is written back.
 */
export const updateUser = action({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
  },
  returns: userDocValidator,
  handler: async (ctx, args): Promise<PublicUserDoc> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const actorUserId = await ctx.runQuery(internal.users.getCallerIdForAction, {});

    const user = await ctx.runQuery(internal.users.getUserByIdForAction, {
      userId: args.userId,
    });
    if (!user) {
      throw new Error("User not found");
    }

    normalizeNames(args.firstName, args.lastName);

    const normalizedEmail: string = await ctx.runQuery(internal.users.normalizeEmailForAction, {
      email: args.email,
      excludeUserId: args.userId,
    });

    const emailChanged = user.email !== normalizedEmail;
    const workOsLinked = emailChanged && hasWorkOsIntegration(user.workosUserId);

    if (workOsLinked) {
      try {
        await updateWorkOsUserEmail(user.workosUserId, normalizedEmail);
      } catch (error) {
        if (error instanceof Error && error.message === EMAIL_UPDATE_FAILED) {
          throw error;
        }
        console.error("WorkOS email update failed", {
          error: error instanceof Error ? error.message : "Unknown error",
          workosUserId: user.workosUserId,
          userId: args.userId,
        });
        throw new Error(EMAIL_UPDATE_FAILED);
      }
    } else if (emailChanged) {
      console.info("Skipping WorkOS email update; App user has no WorkOS link", {
        userId: args.userId,
        email: normalizedEmail,
      });
    }

    try {
      return await ctx.runMutation(internal.users.patchUserDetailInternal, {
        userId: args.userId,
        firstName: args.firstName,
        lastName: args.lastName,
        email: normalizedEmail,
        actorUserId,
      });
    } catch (error) {
      if (!workOsLinked) {
        throw error;
      }

      console.error("Convex patch failed after WorkOS email update; rolling back", {
        error: error instanceof Error ? error.message : "Unknown error",
        workosUserId: user.workosUserId,
        userId: args.userId,
      });

      try {
        await updateWorkOsUserEmail(user.workosUserId, user.email);
      } catch (rollbackError) {
        console.error("WorkOS email rollback failed", {
          error: rollbackError instanceof Error ? rollbackError.message : "Unknown error",
          workosUserId: user.workosUserId,
          userId: args.userId,
        });
        throw new Error(EMAIL_SYNC_FAILED);
      }

      throw error;
    }
  },
});

const createUserResultValidator = v.object({
  user: userDocValidator,
  inviteSent: v.boolean(),
});

type PublicUserDoc = {
  _id: Id<"users">;
  appUserId: string;
  tokenIdentifier: string;
  email: string;
  firstName?: string;
  lastName?: string;
  workosUserId: string;
  roles: Array<"super_admin" | "manager" | "team_member">;
  createdAt: number;
  updatedAt: number;
};

/**
 * Create User: all-or-nothing App user and its WorkOS sign-in; invite send is best-effort.
 * Client calls only this action.
 */
export const createUser = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: createUserResultValidator,
  handler: async (ctx, args): Promise<{ user: PublicUserDoc; inviteSent: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const actorUserId = await ctx.runQuery(internal.users.getCallerIdForAction, {});

    let normalizedEmail: string;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let issuer: string;

    try {
      const names = normalizeNames(args.firstName ?? "", args.lastName ?? "");
      firstName = names.firstName;
      lastName = names.lastName;
      normalizedEmail = await ctx.runQuery(internal.users.normalizeEmailForAction, {
        email: args.email,
      });
      issuer = issuerFromTokenIdentifier(identity.tokenIdentifier);
    } catch (error) {
      console.error("Create User validation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw mapCreateUserError(error);
    }

    console.info("Create User tokenIdentifier issuer", { iss: issuer });

    let workosUserId: string | undefined;
    try {
      const created = await createWorkOsUser({ email: normalizedEmail });
      workosUserId = created.id;
    } catch (error) {
      console.error("Create User WorkOS create failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        email: normalizedEmail,
      });
      throw mapCreateUserError(error);
    }

    if (!workosUserId) {
      throw new Error(CREATE_USER_FAILED);
    }

    const tokenIdentifier = tokenIdentifierForCreatedUser(identity.tokenIdentifier, workosUserId);

    let user: PublicUserDoc;
    try {
      user = await ctx.runMutation(internal.users.insertCreatedUser, {
        email: normalizedEmail,
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        workosUserId,
        tokenIdentifier,
        actorUserId,
      });
    } catch (error) {
      console.error("Create User Convex insert failed; rolling back WorkOS user", {
        error: error instanceof Error ? error.message : "Unknown error",
        workosUserId,
        email: normalizedEmail,
      });
      try {
        await deleteWorkOsUser(workosUserId);
      } catch (rollbackError) {
        console.error("Create User WorkOS rollback failed", {
          error: rollbackError instanceof Error ? rollbackError.message : "Unknown error",
          workosUserId,
        });
      }
      throw new Error(CREATE_USER_FAILED);
    }

    let inviteSent = true;
    try {
      await sendWorkOsInvitation(normalizedEmail);
    } catch (error) {
      inviteSent = false;
      console.error("Create User invite send failed; App user kept", {
        error: error instanceof Error ? error.message : "Unknown error",
        workosUserId,
        email: normalizedEmail,
        userId: user._id,
      });
    }

    return { user, inviteSent };
  },
});
