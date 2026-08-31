import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const listUserValidator = v.object({
  _id: v.id("users"),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export type ListUser = Infer<typeof listUserValidator>;

export const listUsersPageValidator = v.object({
  page: v.array(listUserValidator),
  continueCursor: v.string(),
  isDone: v.boolean(),
});

/** Projection for the Users list — never identity-link fields or combined `name`. */
export function toListUser(user: Doc<"users">): ListUser {
  const listUser: ListUser = {
    _id: user._id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.firstName !== undefined) {
    listUser.firstName = user.firstName;
  }
  if (user.lastName !== undefined) {
    listUser.lastName = user.lastName;
  }

  return listUser;
}
