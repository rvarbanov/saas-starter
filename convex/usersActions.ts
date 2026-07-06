"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { extractEmailFromIdentity, extractNameFromIdentity } from "./lib/identity";
import { fetchWorkOsUserProfile } from "./lib/workosApi";

const storeResultValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
});

/**
 * Provision the signed-in user in Convex. Fetches email from WorkOS when the
 * access token JWT does not include an `email` claim (default AuthKit behavior).
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
    let name = extractNameFromIdentity(identity);

    if (!email) {
      const profile = await fetchWorkOsUserProfile(workosUserId);
      email = profile.email;
      name = name ?? profile.name;
    }

    if (!email) {
      throw new Error("Email required to provision user");
    }

    return await ctx.runMutation(internal.users.upsertFromAuthProfile, {
      tokenIdentifier: identity.tokenIdentifier,
      workosUserId,
      email,
      name,
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

    if (!user.workosUserId) {
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
