import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * App user records linked to WorkOS via `tokenIdentifier`.
 * Convex FKs (e.g. future `user_role`) should use `Id<"users">` (`_id`).
 * External APIs / migration export should use `appUserId` (UUID v4).
 */
export default defineSchema({
  users: defineTable({
    appUserId: v.string(),
    tokenIdentifier: v.string(),
    email: v.string(),
    /** Convex-owned display name derived from firstName + lastName. */
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    workosUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_app_user_id", ["appUserId"]),
});
