/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_upsertUser from "../lib/upsertUser.js";
import type * as lib_userNames from "../lib/userNames.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_workosApi from "../lib/workosApi.js";
import type * as ping from "../ping.js";
import type * as users from "../users.js";
import type * as usersActions from "../usersActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/identity": typeof lib_identity;
  "lib/upsertUser": typeof lib_upsertUser;
  "lib/userNames": typeof lib_userNames;
  "lib/users": typeof lib_users;
  "lib/workosApi": typeof lib_workosApi;
  ping: typeof ping;
  users: typeof users;
  usersActions: typeof usersActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
