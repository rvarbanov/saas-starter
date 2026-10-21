import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { getCurrentUser, requireIdentity } from "./lib/auth";
import { allows, catalogPair } from "./lib/authzCatalog";
import { requireCan } from "./lib/requireCan";

const domainValidator = v.union(v.literal("users"), v.literal("profile"));

const actionValidator = v.union(
  v.literal("list"),
  v.literal("read"),
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("changes.read"),
  v.literal("self.read"),
  v.literal("self.write"),
);

const canArgs = {
  domain: domainValidator,
  action: actionValidator,
};

/**
 * UI gate. Same auth errors as data APIs. A known domain/action pair that is
 * not in the catalog (for example users + self.read) returns false.
 */
export const can = query({
  args: canArgs,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found; complete sign-in provisioning");
    }
    const pair = catalogPair(args.domain, args.action);
    if (!pair) {
      return false;
    }
    return allows(user.roles, pair);
  },
});

/** Server gate for actions. Queries and mutations call `requireCan` directly. */
export const assertCan = internalQuery({
  args: canArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const pair = catalogPair(args.domain, args.action);
    if (!pair) {
      throw new Error("Unauthorized");
    }
    await requireCan(ctx, pair);
    return null;
  },
});
