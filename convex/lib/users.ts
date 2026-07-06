import { assertValidEmailFormat, normalizeEmail } from "./email";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type UserCtx = QueryCtx | MutationCtx;

export { normalizeEmail };

export async function assertEmailAvailable(
  ctx: UserCtx,
  email: string,
  excludeUserId?: Id<"users">,
): Promise<string> {
  assertValidEmailFormat(email);
  const normalized = normalizeEmail(email);

  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();

  if (existing && existing._id !== excludeUserId) {
    throw new Error("Email already registered");
  }

  return normalized;
}
