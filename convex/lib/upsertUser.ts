import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getUserByTokenIdentifier } from "./auth";
import { buildSearchText } from "./searchText";
import { assertEmailAvailable, normalizeEmail } from "./users";

/** Auth-linked fields only — WorkOS must not seed profile names into Convex. */
export type AuthProfile = {
  tokenIdentifier: string;
  workosUserId: string;
  email: string;
};

export type StoreUserResult = {
  _id: Id<"users">;
  appUserId: string;
};

async function getUserByWorkosUserId(ctx: MutationCtx, workosUserId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
    .unique();
}

async function patchAuthProfile(
  ctx: MutationCtx,
  existing: {
    _id: Id<"users">;
    appUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    tokenIdentifier: string;
    workosUserId: string;
    searchText?: string;
  },
  profile: AuthProfile,
  now: number,
): Promise<StoreUserResult> {
  const updates: {
    email?: string;
    tokenIdentifier?: string;
    workosUserId?: string;
    searchText?: string;
    updatedAt: number;
  } = { updatedAt: now };

  const normalizedEmail = normalizeEmail(profile.email);
  if (existing.email !== normalizedEmail) {
    updates.email = await assertEmailAvailable(ctx, profile.email, existing._id);
  }
  if (existing.workosUserId !== profile.workosUserId) {
    updates.workosUserId = profile.workosUserId;
  }
  if (existing.tokenIdentifier !== profile.tokenIdentifier) {
    updates.tokenIdentifier = profile.tokenIdentifier;
  }

  if (updates.email !== undefined) {
    updates.searchText = buildSearchText({
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: updates.email,
    });
  } else if (existing.searchText === undefined) {
    updates.searchText = buildSearchText({
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
    });
  }

  if (
    updates.email !== undefined ||
    updates.workosUserId !== undefined ||
    updates.tokenIdentifier !== undefined ||
    updates.searchText !== undefined
  ) {
    await ctx.db.patch("users", existing._id, updates);
  }

  return { _id: existing._id, appUserId: existing.appUserId };
}

export async function upsertUserFromProfile(
  ctx: MutationCtx,
  profile: AuthProfile,
): Promise<StoreUserResult> {
  const now = Date.now();
  const existing = await getUserByTokenIdentifier(ctx, profile.tokenIdentifier);

  if (existing) {
    return await patchAuthProfile(ctx, existing, profile, now);
  }

  const byWorkos = await getUserByWorkosUserId(ctx, profile.workosUserId);
  if (byWorkos) {
    return await patchAuthProfile(ctx, byWorkos, profile, now);
  }

  const appUserId = crypto.randomUUID();
  const email = await assertEmailAvailable(ctx, profile.email);
  const userId = await ctx.db.insert("users", {
    appUserId,
    tokenIdentifier: profile.tokenIdentifier,
    email,
    workosUserId: profile.workosUserId,
    // Explicit empty set — provisioning does not assign Team member or any role.
    roles: [],
    searchText: buildSearchText({ email }),
    createdAt: now,
    updatedAt: now,
  });

  return { _id: userId, appUserId };
}
