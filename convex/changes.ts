import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireIdentity } from "./lib/auth";
import { actorLabelFor, formatChangeFields } from "./lib/changes";
import { clampPaginationNumItems } from "./lib/pagination";

const changeFieldViewValidator = v.object({
  label: v.string(),
  before: v.string(),
  after: v.string(),
});

const changeListItemValidator = v.object({
  _id: v.id("changes"),
  action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
  at: v.number(),
  actorLabel: v.string(),
  fields: v.array(changeFieldViewValidator),
});

/**
 * Changes for one App user, newest first. Same signed-in gate as `users.getById`.
 * Actor labels include deleted App users; this query does not call `getById`.
 */
export const listForAppUser = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(changeListItemValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);

    const paginationOpts = {
      ...args.paginationOpts,
      numItems: clampPaginationNumItems(args.paginationOpts.numItems),
    };

    const result = await ctx.db
      .query("changes")
      .withIndex("by_subject_and_at", (q) =>
        q.eq("resourceKind", "app_user").eq("subjectId", args.userId),
      )
      .order("desc")
      .paginate(paginationOpts);

    const page = [];
    for (const change of result.page) {
      const actor =
        change.actorUserId !== undefined ? await ctx.db.get("users", change.actorUserId) : null;
      page.push({
        _id: change._id,
        action: change.action,
        at: change.at,
        actorLabel: actorLabelFor(change.actorKind, actor),
        fields: formatChangeFields(change.fields),
      });
    }

    return {
      page,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});
