# Research: WorkOS delete the sign-in for an App user

> Language: the ticket says “Auth user.” The product has one user kind, the App user. WorkOS holds that person’s sign-in (`workosUserId`). See [`CONTEXT.md`](../../CONTEXT.md) and [ADR 0002](../adr/0002-one-app-user-workos-manages-sign-in.md). This note does not decide what **Delete user** removes.

**Ticket:** [RAD-139](https://linear.app/radi-dev/issue/RAD-139/research-workos-delete-an-auth-user)  
**Parent map:** [RAD-138](https://linear.app/radi-dev/issue/RAD-138/wayfinder-delete-user-handoff) (Wayfinder: Delete user handoff)  
**Question:** What does WorkOS User Management allow when we delete the sign-in that belongs to an App user, and what happens to their sessions?

---

## Verdict

The call is `DELETE https://api.workos.com/user_management/users/{id}` with `Authorization: Bearer` the environment API key (`sk_…`). The only required identifier is that path id (the WorkOS user id, `user_01…`). WorkOS describes it as permanent: “Permanently deletes a user in the current environment. It cannot be undone.”

The Delete User page does not publish a success body. The first-party Node SDK method `userManagement.deleteUser(userId)` returns nothing and documents a single thrown error, `404`.

Delete User does **not** say that sessions are revoked. Ending a session is a separate call, `POST /user_management/sessions/revoke` with a `session_id`. WorkOS does spell out “all active sessions are revoked” for password reset and for deactivating an organization membership. It does not say that for delete user.

The Delete User reference does not require sessions, organization memberships, or invitations to be cleared first. Those are other resources with their own APIs.

This repo already performs that DELETE in `deleteWorkOsUser` (`convex/lib/workosApi.ts`). `usersActions.createUser` calls it only to roll back a WorkOS create after the Convex insert fails. That is the client a later write would extend. It does not list or revoke sessions.

---

## 1. Delete User API

### Endpoint

| Item | Value |
| --- | --- |
| Method / path | `DELETE /user_management/users/{id}` |
| Full URL | `https://api.workos.com/user_management/users/{id}` |
| Auth | `Authorization: Bearer sk_…` (environment API key). Requests without a valid key are `401`; a valid key without permission is `403`. API keys can perform any WorkOS API request. All requests must be HTTPS. |
| Required id | Path parameter only. Docs and the Node SDK take the WorkOS user id (`user_01…`). No JSON body in the documented curl. |
| SDK | `workos.userManagement.deleteUser('user_01…')` |
| CLI | `workos user delete <userId> [--yes]` — same user resource, not a different contract |

Sources:

- [Delete a user](https://workos.com/docs/reference/authkit/user/delete) — curl `DELETE https://api.workos.com/user_management/users/user_01…` with `Authorization: Bearer sk_…`; prose “Permanently deletes a user in the current environment. It cannot be undone.”
- [API authentication](https://workos.com/docs/reference/api-authentication) — Bearer API key; `401` / `403`; keys can perform any API request.
- [`@workos-inc/node` `deleteUser`](https://github.com/workos/workos-node/blob/main/src/user-management/user-management.ts) — `DELETE /user_management/users/${userId}`; JSDoc “Permanently deletes a user in the current environment. It cannot be undone.”; `@throws {NotFoundException} 404`; no return value.
- [WorkOS CLI](https://workos.com/docs/cli) — `workos user delete <userId> [--yes]`.

### Success shape

The public Delete User page shows the request and does not show a response example.

The Node client treats any HTTP 2xx (`res.ok`) as success and does not parse the body for `delete()`. `deleteUser` therefore resolves with no user object.

There is no documented idempotent success. The generated SDK contract lists `404` when the user is not found, including a second delete of an id that is already gone.

Sources:

- [Delete a user](https://workos.com/docs/reference/authkit/user/delete) — request samples only.
- [`WorkOS.delete`](https://github.com/workos/workos-node/blob/main/src/workos.ts) — `delete()` awaits the HTTP client and returns no data.
- [`FetchHttpClient.fetchRequest`](https://github.com/workos/workos-node/blob/main/src/common/net/fetch-client.ts) — non-OK statuses throw; OK responses are returned without the `delete()` caller reading JSON.

### Error shape

Delete User’s own page does not list error bodies. Two layers are documented:

| Status | Where it is specified |
| --- | --- |
| `404` | Node `deleteUser` JSDoc: `NotFoundException`. Handler uses JSON `message` when present, otherwise `The requested path '…' could not be found.` Also reads optional `code` and `X-Request-ID`. |
| `401` | [API authentication](https://workos.com/docs/reference/api-authentication) and [Errors](https://workos.com/docs/reference/errors): invalid API key. Node maps this to `UnauthorizedException` (no body message). |
| `403` | Same pages: valid key, insufficient permissions. Node falls through to `GenericServerException` with `data.message` when the body is not an OAuth-style error. |
| `400` / `422` | [Errors](https://workos.com/docs/reference/errors): bad parameters / validation failed. Node maps `422` to `UnprocessableEntityException` (`code`, `message`, `errors`) and a body with `code` + `errors` to `BadRequestException`. **Not** listed on `deleteUser`’s JSDoc. |
| `429` | [Errors](https://workos.com/docs/reference/errors) and [Rate limits](https://workos.com/docs/reference/rate-limits). Node maps `message` plus `Retry-After`. |
| `5xx` | [Errors](https://workos.com/docs/reference/errors): WorkOS server error. |

AuthKit User Management **writes** (`/user_management/*`) are limited to **500 requests / 10 seconds** per environment, inside the general **6,000 requests / 60 seconds** per API key. One delete is inside that budget. Listing sessions and revoking them one by one is several extra calls on the same write bucket.

The Node error parser expects a JSON object with some of `message`, `code`, `errors`, `error`, and `error_description`. A non-JSON error body becomes a parse error instead. No Delete User example publishes the exact `404` JSON.

Sources: [Errors](https://workos.com/docs/reference/errors), [Rate limits](https://workos.com/docs/reference/rate-limits), [`handleHttpError`](https://github.com/workos/workos-node/blob/main/src/workos.ts), [`NotFoundException`](https://github.com/workos/workos-node/blob/main/src/common/exceptions/not-found.exception.ts).

### Irreversible in WorkOS

Yes, as stated on the Delete User page: it cannot be undone. There is no restore, undelete, or “reactivate user” method on the User reference.

A successful delete emits `user.deleted`. The event `data` is the User object (id, email, names, `email_verified`, timestamps). The description is “Triggered when a user is deleted.” The sample does not include sessions, memberships, or invitations.

Source: [User events — User deleted](https://workos.com/docs/events/user).

---

## 2. Sessions

### Delete User does not document session revocation

The Delete User reference, the `user.deleted` event, and `deleteUser` in the Node SDK do not mention sessions.

WorkOS does document session revocation when it is part of the operation:

| Operation | What the doc says about sessions |
| --- | --- |
| Reset password | “When a user's password is reset, all of their active sessions are revoked.” |
| Deactivate an organization membership | Deactivating sets status `inactive` **and revokes all active sessions**. |
| Delete user | No session sentence. |

Sources: [Password reset](https://workos.com/docs/reference/authkit/password-reset), [Users and organizations](https://workos.com/docs/authkit/users-organizations), [Delete a user](https://workos.com/docs/reference/authkit/user/delete).

### Separate list and revoke calls

| Call | Contract |
| --- | --- |
| List | `GET /user_management/users/{id}/sessions`. “Get a list of all active sessions for a specific user.” Optional `before`, `after`, `limit` (1–100, default 10), `order`. Returns a list of session objects (`id`, `user_id`, `status`, `expires_at`, `ended_at`, …). Node JSDoc: `@throws {NotFoundException} 404`, `@throws {UnprocessableEntityException} 422`. |
| Revoke one | `POST /user_management/sessions/revoke` with JSON `{ "session_id": "…" }`. `session_id` is required. “This can be extracted from the `sid` claim of the access token.” Node `revokeSession` returns void and `@throws {BadRequestException} 400`. |

There is no User Management REST method on these pages that revokes every session for a user id in one call.

The Widgets GraphQL mutation `revokeAllSessions` “Revokes all active sessions for the authenticated user except the current one.” That is a session-token, self-serve widget API, not an API-key delete of another person’s sign-in.

Revoking a session emits `session.revoked` (“Triggered when an issued session is revoked for a user.”). That event is separate from `user.deleted`. The docs do not say a user delete emits `session.revoked`.

Sources:

- [Session — list and revoke](https://workos.com/docs/reference/authkit/session/revoke)
- [Widgets API — revoke all sessions](https://workos.com/docs/widgets-api/authentication/revoke-all-sessions)
- [Session events](https://workos.com/docs/events/user)

### What an already issued session still is

A successful AuthKit sign-in returns an access token and a refresh token.

- The access token is a JWT. Claims include `sub` (WorkOS user id), `sid` (session id, “used for signing out”), `iss`, and `exp`. “The token should not be trusted after this time.” The Sessions guide recommends a short access-token duration “so that changes in the session are quickly reflected in your app.” Checking the JWT signature and `exp` is the documented per-request check. It is not a live call to Get User.
- Refresh “will succeed as long as the user's session is still active.” A revoked, expired, or already-consumed refresh token is a terminal `invalid_grant` at HTTP 400. Because Delete User does not say it ends the session, the docs do not say that refresh starts failing when the user row is deleted.
- Signing out, as documented, is its own sequence: read `sid` from the access token, delete the app session, redirect the browser to the WorkOS logout URL. Delete User is not that sequence.

Sources: [Sessions](https://workos.com/docs/authkit/sessions), [Session tokens — refresh token](https://workos.com/docs/reference/authkit/session-tokens/refresh-token), [Session resilience](https://workos.com/docs/authkit/session-resilience).

### What this app does with sessions today

Sign out is `GET /sign-out`, which calls AuthKit `signOut({ returnTo })` (`app/sign-out/route.ts`). The Avatar menu navigates there (`lib/sign-out-client.ts`). Nothing in `convex/lib/workosApi.ts` or `convex/usersActions.ts` calls `sessions/revoke` or lists sessions.

The app session is the AuthKit sealed cookie plus the Convex JWT. Deleting the WorkOS user via the API does not, by itself, run that sign-out route or clear the cookie.

---

## 3. Ordering constraints

The Delete User reference takes only the user id. It does not say the call fails when the user still has sessions, organization memberships, or invitations. The Node method documents `404` and no other precondition error.

### Sessions

Active sessions are listed and revoked with the calls in section 2. Nothing on Delete User says they must be revoked first, or that delete is rejected while any remain. Nothing says delete clears them either. Both “must revoke first” and “delete revokes them” are unsupported by the Delete User page.

### Organization memberships

A user “may be a member of zero, one, or many organizations.” Membership is its own resource:

| Call | Documented effect |
| --- | --- |
| Deactivate | `PUT /user_management/organization_memberships/{id}/deactivate`. Status `inactive`, and **all active sessions are revoked**. Pending memberships cannot be deactivated; delete the membership instead. |
| Delete membership | `DELETE /user_management/organization_memberships/{id}`. “Permanently deletes an existing organization membership. It cannot be undone.” The page does not say this revokes sessions. |
| Delete user after that | Product guide, not an error code: for a hard-delete model, “an app in this case may even want to entirely delete the User once the membership is deleted.” |

That sentence is optional follow-up guidance. It is not a documented `4xx` if memberships still exist.

This repo’s Create path does not create an organization membership. `sendWorkOsInvitation` posts `{ email }` only (`convex/lib/workosApi.ts`).

Sources: [Users and organizations](https://workos.com/docs/authkit/users-organizations), [Organization membership](https://workos.com/docs/reference/authkit/organization-membership).

### Invitations

Invitations are a separate object. Revoke is `POST /user_management/invitations/{id}/revoke` and returns the invitation with `state: "revoked"`. Delete User does not mention invitations, and the invitation docs do not say deleting the user revokes pending invites.

Relevant to the invite this repo already sends:

- An invitation without `organization_id` is an invitation to join the application.
- Invitations are for new and existing users. If no user exists for that email, the link is a sign-up link.
- When sign-up is disabled, a valid invitation code still opens registration for that invite.
- An application-wide invitation (no organization) can be accepted with **any** email address, not only the invited one.

So a pending invite created by `sendWorkOsInvitation` is not documented as cleaned up by Delete User. While it is still valid, it can still open sign-up.

Sources: [Revoke an invitation](https://workos.com/docs/reference/authkit/invitation/revoke), [Invitations](https://workos.com/docs/authkit/invitations).

---

## 4. Client this repo would extend

WorkOS HTTP lives in `convex/lib/workosApi.ts`. Callers are in `convex/usersActions.ts` (`"use node"`). Credential is Convex env `WORKOS_API_KEY` via `requireWorkOsApiKey()`. Base URL constant: `https://api.workos.com/user_management`. No `@workos-inc/node` User Management client; these are `fetch` calls.

| Function | HTTP | Used by |
| --- | --- | --- |
| `fetchWorkOsUserProfile` | `GET /users/{id}` | `provisionUser` when the JWT has no email |
| `createWorkOsUser` | `POST /users` with `{ email, first_name?, last_name? }` (no password) | `createUser` |
| `sendWorkOsInvitation` | `POST /invitations` with `{ email }` only | `createUser`, after the Convex insert; failure sets `inviteSent: false` and keeps both rows |
| `deleteWorkOsUser` | `DELETE /users/{id}` with `Authorization: Bearer` | `createUser` only, after the Convex insert throws |

`updateEmail` and `updateUserDetail` do **not** go through `workosApi.ts`. Each inlines `PUT /user_management/users/${workosUserId}` with `{ email }` and the same API key. Email update does not revoke sessions (see [RAD-87 note](./workos-update-email-other-user.md)).

`deleteWorkOsUser` today:

- Sends the same DELETE the public docs describe.
- Does not read a success body (any `response.ok` returns).
- On any non-OK status, logs `status`, body, and `workosUserId`, then throws `CREATE_USER_FAILED` (`"Failed to create user. Please try again."`). A `404` is that same failure, not a success.
- Does not list sessions, revoke sessions, revoke invitations, or touch organization memberships.

`createUser` order is WorkOS create, then Convex `insertCreatedUser`, then best-effort invite. If the insert fails, it calls `deleteWorkOsUser`. If that rollback also fails, it logs `"Create User WorkOS rollback failed"` and still throws `CREATE_USER_FAILED`. The WorkOS user can remain with no App user row.

---

## 5. Why one action that destroys the WorkOS sign-in and the Convex row is not one transaction

Facts that make a single Convex action unsafe if it is treated as atomic. This section does not choose which record Delete user should remove.

1. **The WorkOS delete cannot be undone.** There is no API to put the same `user_01…` id back. Create’s compensating `deleteWorkOsUser` works in one direction only: the sign-in was just created and is discarded. The opposite failure (WorkOS delete succeeded, Convex delete did not) cannot be repaired by creating “the same” WorkOS user. A later `createUser` would be a new id. Whether the old email can be reused is not stated on the Delete User page (open gap below).

2. **A Convex action is not a transaction with `fetch`.** The existing writes already split:
   - `updateEmail`: WorkOS `PUT` first. If `patchEmailInternal` then fails, the action throws “Email updated in WorkOS but failed to sync to the app.”
   - `createUser`: WorkOS create first. If the Convex insert fails, rollback delete is best-effort and its failure is only logged.

3. **WorkOS delete succeeds, Convex delete fails.** The sign-in is gone and cannot be restored to that id. The App user row remains, still storing that `workosUserId` and email. Sign-in for that id cannot succeed, because the WorkOS user is gone. The row is not rolled back by anything in the current client.

4. **Convex delete succeeds, WorkOS delete fails.** The App user row is gone. The WorkOS sign-in still exists, so AuthKit can still sign that person in. `provisionUser` then calls `upsertFromAuthProfile`. `upsertUserFromProfile` looks up `tokenIdentifier`, then `workosUserId`, and otherwise **inserts a new App user** (`crypto.randomUUID()` `appUserId`, `roles: []`). That is a new record, not a restore of the deleted row. Sessions are also still whatever they were, because this path does not revoke them (section 2).

5. **Sessions and the AuthKit cookie are outside the DELETE.** `deleteWorkOsUser` does not call `POST /user_management/sessions/revoke` or `GET /sign-out`. An access token already issued remains a JWT until `exp`. Refresh is documented to keep working while the session is still active, and Delete User does not say the session ended. The browser cookie is cleared by the sign-out route, which this action would not run for the target person.

6. **A pending application invite is outside the DELETE.** `createUser` may already have called `sendWorkOsInvitation`. Delete User is not documented to revoke that invitation. A still-valid code can still open registration (section 3).

7. **Retry is not idempotent in the current helper.** A second DELETE of an already-deleted id is the SDK’s `404`. `deleteWorkOsUser` turns every non-OK response, including `404`, into `CREATE_USER_FAILED`. A retry after a successful WorkOS delete would fail the WorkOS step even though the sign-in is already gone.

8. **Missing API key fails closed before HTTP.** `requireWorkOsApiKey()` throws if `WORKOS_API_KEY` is unset. The action would not reach either delete.

---

## Open gaps

1. Whether WorkOS actually ends sessions when a user is deleted is **not stated**. The safe reading of the primary docs is: do not treat Delete User as session revocation; the documented revoke is per `session_id`.
2. The exact success status and body are not on the Delete User page. The Node SDK accepts any 2xx and ignores the body.
3. The exact `404` JSON for a missing user is not on that page. The client parser uses `message` and optional `code` when the body is JSON.
4. Whether a user who still has organization memberships, active sessions, or pending invitations gets a non-404 error is not documented. The generated `deleteUser` contract only lists `404`.
5. Whether the email can be used again after delete is not on the Delete User page.
6. Whether an AuthKit user provisioned from Directory Sync / SSO can be deleted with this endpoint is not on the Delete User page. Directory Sync’s own API is read-only toward the customer directory ([Directory Sync quick start](https://workos.com/docs/directory-sync/quick-start)); that is a different object from User Management delete. Email **update** is rejected for IdP-managed users ([email research](./workos-update-email-other-user.md)); delete does not repeat that exception.

---

## Sources (primary)

### WorkOS

- https://workos.com/docs/reference/authkit/user/delete
- https://workos.com/docs/reference/api-authentication
- https://workos.com/docs/reference/errors
- https://workos.com/docs/reference/rate-limits
- https://workos.com/docs/events/user
- https://workos.com/docs/reference/authkit/session/revoke
- https://workos.com/docs/authkit/sessions
- https://workos.com/docs/reference/authkit/session-tokens/refresh-token
- https://workos.com/docs/authkit/session-resilience
- https://workos.com/docs/reference/authkit/password-reset
- https://workos.com/docs/authkit/users-organizations
- https://workos.com/docs/reference/authkit/organization-membership
- https://workos.com/docs/reference/authkit/invitation/revoke
- https://workos.com/docs/authkit/invitations
- https://workos.com/docs/widgets-api/authentication/revoke-all-sessions
- https://workos.com/docs/cli
- https://workos.com/docs/directory-sync/quick-start
- https://github.com/workos/workos-node/blob/main/src/user-management/user-management.ts
- https://github.com/workos/workos-node/blob/main/src/workos.ts
- https://github.com/workos/workos-node/blob/main/src/common/net/fetch-client.ts
- https://github.com/workos/workos-node/blob/main/src/common/exceptions/not-found.exception.ts

### This repo

- `convex/lib/workosApi.ts` — `createWorkOsUser`, `sendWorkOsInvitation`, `deleteWorkOsUser`, `fetchWorkOsUserProfile`
- `convex/usersActions.ts` — `provisionUser`, `updateEmail`, `updateUserDetail`, `createUser`
- `convex/lib/upsertUser.ts` — `upsertUserFromProfile`
- `convex/users.ts` — `upsertFromAuthProfile`
- `app/sign-out/route.ts` — AuthKit `signOut`
- `lib/sign-out-client.ts` — Avatar menu navigates to `/sign-out`
- `docs/adr/0002-one-app-user-workos-manages-sign-in.md`
- `CONTEXT.md`
