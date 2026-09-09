import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { rolesValidator } from "./lib/roles";

/**
 * App user records linked to WorkOS via `tokenIdentifier`.
 * Convex FKs should use `Id<"users">` (`_id`).
 * External APIs / migration export should use `appUserId` (UUID v4).
 *
 * Roles: optional multi-role set on the user (`super_admin` | `manager` | `team_member`).
 * Missing `roles` means none assigned yet (v1: assign manually via `users.setRoles`).
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
    /**
     * Product roles (multi-role allowed). Omitted on legacy rows — treat as [].
     * Provisioning does not assign a default role.
     */
    roles: v.optional(rolesValidator),
    /**
     * Denormalized lowercase firstName + lastName + email for directory search.
     * Optional during backfill; writers always set it going forward.
     */
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_app_user_id", ["appUserId"])
    .index("by_updatedAt", ["updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
    }),
});
