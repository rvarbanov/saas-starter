import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const listedUserValidator = v.object({
  _id: v.id("users"),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export type ListedUser = Infer<typeof listedUserValidator>;

export const listedUsersPageValidator = v.object({
  page: v.array(listedUserValidator),
  continueCursor: v.string(),
  isDone: v.boolean(),
});

/** Projection for the Users list — never identity-link fields or combined `name`. */
export function toListedUser(user: Doc<"users">): ListedUser {
  const listed: ListedUser = {
    _id: user._id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.firstName !== undefined) {
    listed.firstName = user.firstName;
  }
  if (user.lastName !== undefined) {
    listed.lastName = user.lastName;
  }

  return listed;
}
