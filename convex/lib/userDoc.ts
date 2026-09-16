import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { normalizeRoles, rolesValidator } from "./roles";

export const userDocValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
  tokenIdentifier: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  workosUserId: v.string(),
  /** Always present on the public App user DTO; empty when none assigned. */
  roles: rolesValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export function toPublicUserDoc(user: Doc<"users">) {
  return {
    _id: user._id,
    appUserId: user.appUserId,
    tokenIdentifier: user.tokenIdentifier,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    workosUserId: user.workosUserId,
    roles: normalizeRoles(user.roles),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
