import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { normalizeRoles, rolesValidator } from "./roles";

export const userDocValidator = v.object({
  _id: v.id("users"),
  appUserId: v.string(),
  tokenIdentifier: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  workosUserId: v.string(),
  /** Always present on the public App user DTO; empty when none assigned. */
  roles: rolesValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Profile floor. `_id` is wire-only for React keys and `updateUser({ userId })`. */
export const meUserValidator = v.object({
  _id: v.id("users"),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  roles: rolesValidator,
});

export function toMeUser(user: Doc<"users">) {
  return {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: normalizeRoles(user.roles),
  };
}

export function toPublicUserDoc(user: Doc<"users">) {
  return {
    _id: user._id,
    appUserId: user.appUserId,
    tokenIdentifier: user.tokenIdentifier,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    workosUserId: user.workosUserId,
    roles: normalizeRoles(user.roles),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
