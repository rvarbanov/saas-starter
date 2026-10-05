import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { rolesValidator } from "./lib/roles";

/**
 * App user records. WorkOS manages sign-in; the link is `tokenIdentifier`
 * (session identity), never email. `workosUserId` is the fallback when the
 * issuer changes.
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
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    workosUserId: v.string(),
    /**
     * Product roles (multi-role allowed). Omitted on legacy rows — treat as [].
     * Provisioning does not assign a default role.
     */
    roles: v.optional(rolesValidator),
    /**
     * Denormalized lowercase firstName + lastName + email for Users list search.
     * Optional during backfill; writers always set it going forward.
     */
    searchText: v.optional(v.string()),
    /**
     * Soft-delete timestamp. Set means the App user is deleted: hidden from
     * the Users list and from User detail. The row stays. Sign-in must not clear it.
     */
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_app_user_id", ["appUserId"])
    .index("by_workosUserId", ["workosUserId"])
    .index("by_updatedAt", ["updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
    }),
  /**
   * Append-only Change rows. One row per App user create, update, or delete.
   * `subjectId` is the subject's `users` `_id`. System actors omit `actorUserId`.
   */
  changes: defineTable({
    resourceKind: v.literal("app_user"),
    subjectId: v.string(),
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    actorKind: v.union(v.literal("user"), v.literal("system")),
    actorUserId: v.optional(v.id("users")),
    at: v.number(),
    fields: v.array(
      v.object({
        field: v.union(
          v.literal("firstName"),
          v.literal("lastName"),
          v.literal("email"),
          v.literal("roles"),
        ),
        before: v.union(v.string(), v.null()),
        after: v.union(v.string(), v.null()),
      }),
    ),
  }).index("by_subject_and_at", ["resourceKind", "subjectId", "at"]),
});
