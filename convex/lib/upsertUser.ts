import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getUserByTokenIdentifier } from "./auth";
import { assertEmailAvailable, normalizeEmail } from "./users";

export type AuthProfile = {
  tokenIdentifier: string;
  workosUserId: string;
  email: string;
  name?: string;
};

export type StoreUserResult = {
  _id: Id<"users">;
  appUserId: string;
};

export async function upsertUserFromProfile(
  ctx: MutationCtx,
  profile: AuthProfile,
): Promise<StoreUserResult> {
  const now = Date.now();
  const existing = await getUserByTokenIdentifier(ctx, profile.tokenIdentifier);

  if (existing) {
    const updates: {
      email?: string;
      name?: string;
      workosUserId?: string;
      updatedAt: number;
    } = { updatedAt: now };

    const normalizedEmail = normalizeEmail(profile.email);
    if (existing.email !== normalizedEmail) {
      updates.email = await assertEmailAvailable(ctx, profile.email, existing._id);
    }
    if (existing.name !== profile.name) {
      updates.name = profile.name;
    }
    if (existing.workosUserId !== profile.workosUserId) {
      updates.workosUserId = profile.workosUserId;
    }

    if (
      updates.email !== undefined ||
      updates.name !== undefined ||
      updates.workosUserId !== undefined
    ) {
      await ctx.db.patch("users", existing._id, updates);
    }

    return { _id: existing._id, appUserId: existing.appUserId };
  }

  const appUserId = crypto.randomUUID();
  const email = await assertEmailAvailable(ctx, profile.email);
  const userId = await ctx.db.insert("users", {
    appUserId,
    tokenIdentifier: profile.tokenIdentifier,
    email,
    name: profile.name,
    workosUserId: profile.workosUserId,
    createdAt: now,
    updatedAt: now,
  });

  return { _id: userId, appUserId };
}
