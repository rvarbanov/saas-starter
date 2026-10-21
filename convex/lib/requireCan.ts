import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser, requireIdentity } from "./auth";
import { allows, type CanArgs } from "./authzCatalog";

type AuthCtx = QueryCtx | MutationCtx;

/**
 * Signed-in provisioned App user who holds the Action.
 * No JWT → "Not authenticated". JWT without an App user → provisioning error.
 * Provisioned but not allowed → "Unauthorized".
 */
export async function requireCan(ctx: AuthCtx, args: CanArgs): Promise<Doc<"users">> {
  await requireIdentity(ctx);
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found; complete sign-in provisioning");
  }
  if (!allows(user.roles, args)) {
    throw new Error("Unauthorized");
  }
  return user;
}
