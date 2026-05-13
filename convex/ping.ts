import { v } from "convex/values";
import { query } from "./_generated/server";

/** Read-only health query for the Convex + Next.js wiring (Phase 4). */
export const getMessage = query({
  args: {},
  returns: v.object({
    ok: v.literal(true),
    message: v.string(),
  }),
  handler: async () => {
    return { ok: true as const, message: "Convex is connected" };
  },
});

/** Authenticated viewer profile; `null` when the client has no valid Convex auth identity. */
export const getViewerProfile = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      tokenIdentifier: v.string(),
      subject: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      name: identity.name,
      email: identity.email,
    };
  },
});
