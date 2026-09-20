"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { extractEmailFromIdentity } from "./lib/identity";
import { assertAssignableRoles, type Role, rolesValidator } from "./lib/roles";
import { issuerFromTokenIdentifier, tokenIdentifierForCreatedUser } from "./lib/tokenIdentifier";
import { userDocValidator } from "./lib/userDoc";
import { normalizeNames } from "./lib/userNames";
import {
  CREATE_USER_FAILED,
  EMAIL_ALREADY_REGISTERED,
  createWorkOsUser,
  deleteWorkOsUser,
  fetchWorkOsUserProfile,
  sendWorkOsInvitation,
} from "./lib/workosApi";

const storeResultValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
});

/** True when the App user is linked to a WorkOS Auth user we can update. */
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

/** Update the authenticated user's email in WorkOS, then mirror the change in Convex. */
export const updateEmail = action({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByTokenForAction, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      throw new Error("User not found; complete sign-in provisioning");
    }

    if (!hasWorkOsIntegration(user.workosUserId)) {
      throw new Error("WorkOS user id missing; sign in again to re-provision");
    }

    const normalized = await ctx.runQuery(internal.users.normalizeEmailForAction, {
      email: args.email,
      excludeUserId: user._id,
    });

    if (user.email === normalized) {
      throw new Error("Email is unchanged");
    }

    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY is not configured on this Convex deployment");
    }

    const response = await fetch(
      `https://api.workos.com/user_management/users/${user.workosUserId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalized }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("WorkOS email update failed", {
        status: response.status,
        body: errorBody,
        workosUserId: user.workosUserId,
      });
      throw new Error("Failed to update email. Please try again.");
    }

    try {
      await ctx.runMutation(internal.users.patchEmailInternal, {
        tokenIdentifier: identity.tokenIdentifier,
        email: normalized,
      });
    } catch (error) {
      console.error("Convex email patch failed after WorkOS update", {
        error: error instanceof Error ? error.message : "Unknown error",
        workosUserId: user.workosUserId,
        email: normalized,
      });
      throw new Error(
        "Email updated in WorkOS but failed to sync to the app. Sign in again or contact support.",
      );
    }

    return null;
  },
});

/**
 * User detail Save: update another App user's names, email, and assignable roles.
 * If email changed and the subject has a WorkOS id, Update User runs first; if WorkOS
 * is not linked yet, Convex is updated only (no WorkOS call).
 */
export const updateUserDetail = action({
  args: {
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    roles: rolesValidator,
  },
  returns: userDocValidator,
  handler: async (
    ctx,
    args,
  ): Promise<{
    _id: Id<"users">;
    appUserId: string;
    tokenIdentifier: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    workosUserId: string;
    roles: Array<"super_admin" | "manager" | "team_member">;
    createdAt: number;
    updatedAt: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByIdForAction, {
      userId: args.userId,
    });
    if (!user) {
      throw new Error("User not found");
    }

    // Validate before any WorkOS or DB write (fail closed).
    normalizeNames(args.firstName, args.lastName);
    assertAssignableRoles(args.roles);

    const normalizedEmail: string = await ctx.runQuery(internal.users.normalizeEmailForAction, {
      email: args.email,
      excludeUserId: args.userId,
    });

    const emailChanged = user.email !== normalizedEmail;

    if (emailChanged && hasWorkOsIntegration(user.workosUserId)) {
      const apiKey = process.env.WORKOS_API_KEY;
      if (!apiKey) {
        throw new Error("WORKOS_API_KEY is not configured on this Convex deployment");
      }

      const response = await fetch(
        `https://api.workos.com/user_management/users/${user.workosUserId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("WorkOS email update failed (User detail)", {
          status: response.status,
          body: errorBody,
          workosUserId: user.workosUserId,
          userId: args.userId,
        });
        throw new Error("Failed to update email. Please try again.");
      }
    } else if (emailChanged) {
      // Subject not linked to WorkOS yet — Convex-only email change.
      console.info("Skipping WorkOS email update; App user has no WorkOS link", {
        userId: args.userId,
        email: normalizedEmail,
      });
    }

    return await ctx.runMutation(internal.users.patchUserDetailInternal, {
      userId: args.userId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: normalizedEmail,
      roles: args.roles,
    });
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
  name?: string;
  firstName?: string;
  lastName?: string;
  workosUserId: string;
  roles: Array<"super_admin" | "manager" | "team_member">;
  createdAt: number;
  updatedAt: number;
};

function isCreatorFacingError(message: string): boolean {
  return (
    message === "Not authenticated" ||
    message === "Invalid email address" ||
    message === EMAIL_ALREADY_REGISTERED ||
    message.startsWith("First name must be at most") ||
    message.startsWith("Last name must be at most") ||
    message === "Cannot assign super_admin via User detail" ||
    message.startsWith("Invalid role:")
  );
}

function creatorFacingError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (isCreatorFacingError(message)) {
    return error instanceof Error ? error : new Error(message);
  }
  return new Error(CREATE_USER_FAILED);
}

/**
 * Create User: all-or-nothing App user + Auth user; invite send is best-effort.
 * Client calls only this action.
 */
export const createUser = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    roles: v.optional(rolesValidator),
  },
  returns: createUserResultValidator,
  handler: async (ctx, args): Promise<{ user: PublicUserDoc; inviteSent: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const roles: Role[] = args.roles ?? [];
    let normalizedEmail: string;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let assignable: Role[];
    let issuer: string;

    try {
      const names = normalizeNames(args.firstName ?? "", args.lastName ?? "");
      firstName = names.firstName;
      lastName = names.lastName;
      assignable = assertAssignableRoles(roles);
      normalizedEmail = await ctx.runQuery(internal.users.normalizeEmailForAction, {
        email: args.email,
      });
      issuer = issuerFromTokenIdentifier(identity.tokenIdentifier);
    } catch (error) {
      console.error("Create User validation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw creatorFacingError(error);
    }

    console.info("Create User tokenIdentifier issuer", { iss: issuer });

    let workosUserId: string | undefined;
    try {
      const created = await createWorkOsUser({
        email: normalizedEmail,
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      });
      workosUserId = created.id;
    } catch (error) {
      console.error("Create User WorkOS create failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        email: normalizedEmail,
      });
      throw creatorFacingError(error);
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
        roles: assignable,
        workosUserId,
        tokenIdentifier,
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
      console.error("Create User invite send failed; App+Auth user kept", {
        error: error instanceof Error ? error.message : "Unknown error",
        workosUserId,
        email: normalizedEmail,
        userId: user._id,
      });
    }

    return { user, inviteSent };
  },
});
