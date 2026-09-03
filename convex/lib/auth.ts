import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  isManager,
  isSuperAdmin,
  isSuperAdminOrManager,
  isTeamMemberOnly,
  normalizeRoles,
  type Role,
} from "./roles";

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

export function getRolesForUser(user: Doc<"users">): Role[] {
  return normalizeRoles(user.roles);
}

export function userIsSuperAdmin(user: Doc<"users">): boolean {
  return isSuperAdmin(user.roles);
}

export function userIsManager(user: Doc<"users">): boolean {
  return isManager(user.roles);
}

export function userIsSuperAdminOrManager(user: Doc<"users">): boolean {
  return isSuperAdminOrManager(user.roles);
}

export function userIsTeamMemberOnly(user: Doc<"users">): boolean {
  return isTeamMemberOnly(user.roles);
}

/**
 * Caller must be provisioned and hold Super admin and/or Manager.
 * Throws `"Unauthorized"` when roles are insufficient (for RAD-70+).
 */
export async function requireSuperAdminOrManager(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await getCurrentUserOrThrow(ctx);
  if (!userIsSuperAdminOrManager(user)) {
    throw new Error("Unauthorized");
  }
  return user;
}

export type { Id };
