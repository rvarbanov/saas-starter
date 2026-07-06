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
