import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

export function identityOrThrow(identity: UserIdentity | null): UserIdentity {
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function requireIdentity(ctx: AuthCtx): Promise<UserIdentity> {
  return identityOrThrow(await ctx.auth.getUserIdentity());
}

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function getCurrentUserOrThrow(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found; complete sign-in provisioning");
  }
  return user;
}

export async function getUserByTokenIdentifier(
  ctx: AuthCtx,
  tokenIdentifier: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

export type { Id };
