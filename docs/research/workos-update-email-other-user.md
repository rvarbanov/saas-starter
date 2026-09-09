# Research: WorkOS update email for another Auth user

**Ticket:** [RAD-87](https://linear.app/radi-dev/issue/RAD-87/research-workos-update-email-for-another-auth-user)  
**Parent map:** [RAD-86](https://linear.app/radi-dev/issue/RAD-86/wayfinder-user-detail-handoff) (User detail handoff)  
**Branch:** `research/workos-update-email-other-user`  
**Question:** What WorkOS API can update **another** Auth user’s email from our backend, what credentials it needs, failure modes, and how that compares to the existing self `usersActions.updateEmail` path?

---

## Verdict

Use the same **User Management Update User** API already used by self email update:

`PUT https://api.workos.com/user_management/users/{user_id}` with body `{ "email": "<new>" }`, authenticated by the environment **`WORKOS_API_KEY`** (`Bearer sk_…`).

That endpoint is **not** scoped to the signed-in user. The API key can update any AuthKit user in the environment by `user_id`. Our self path is “self-only” only because Convex resolves `workosUserId` from the caller’s identity — not because WorkOS requires it.

There is **no separate Admin-only email endpoint**. Widgets / User Profile GraphQL email-change mutations are **self-serve** (elevated token for the token subject) and are the wrong shape for a manager Save on User detail.

---

## 1. Primary API: Update User (admin / backend)

### Endpoint

| Item | Value |
| --- | --- |
| Method / path | `PUT /user_management/users/{id}` |
| Auth | `Authorization: Bearer sk_…` (WorkOS environment API key) |
| Email body field | `email` (optional string). Docs: changing email sets `email_verified` to `false`; identities that do not match the new email are unlinked. |
| SDK | `workos.userManagement.updateUser({ userId, email, … })` |

Sources:

- [Update a user](https://workos.com/docs/reference/authkit/user/update) — parameters for `PUT /user_management/users/{id}` include optional `email`.
- [Support for changing email addresses](https://workos.com/changelog/support-for-changing-email-addresses) (2025-05-30) — email change via Update User API **and** Dashboard; email becomes unverified; OAuth identities unlinked when they no longer match; **not allowed for IdP-managed (SSO/SCIM) users**.
- [May 2025 updates](https://workos.com/blog/may-2025-updates) — same product behavior summary.
- [Email Changes](https://workos.com/docs/authkit/email-changes) — “An email set directly through the update user API is not automatically verified.” Enterprise-managed users: Update User also rejects email changes (IdP is authoritative).

### Credentials / “scopes”

| Need | Detail |
| --- | --- |
| Credential | Environment secret API key (`sk_…`), same as today for `usersActions.updateEmail` / `fetchWorkOsUserProfile`. |
| Where we store it | Convex deployment env `WORKOS_API_KEY` (see repo README / epoch doc). |
| OAuth / widget scopes | **Not applicable.** Server-side User Management calls use the environment API key, not end-user OAuth scopes. |
| Key power | WorkOS documents that API keys can perform **any** API request to WorkOS; invalid key → `401`, valid key without correct permissions → `403`. |

Sources:

- [API authentication](https://workos.com/docs/reference/api-authentication)
- [Errors](https://workos.com/docs/reference/errors) (`401` / `403`)

**Note:** AuthKit “API Keys” for *your app’s* customers (org/user-owned keys with permission slugs) are a different product surface and are **not** what authenticates Update User from Convex.

### Side effects when email changes via Update User

From WorkOS changelog + Email Changes docs:

1. **`email_verified` → false** (unless you also pass `email_verified: true` on the same PUT — documented as a migration/exception path, not the normal flow).
2. User must verify the new email on a later sign-in / verification flow.
3. Linked OAuth identities whose email no longer matches are **unlinked**.
4. **Sessions remain active** (email change alone does not revoke sessions).
5. **Blocked** for users managed by Directory Sync / enterprise SSO (IdP authoritative).

Sources: [changelog](https://workos.com/changelog/support-for-changing-email-addresses), [Email Changes](https://workos.com/docs/authkit/email-changes), [Update User `email` / `email_verified` params](https://workos.com/docs/reference/authkit/user/update).

---

## 2. Alternate APIs (usually wrong for manager User-detail Save)

### A. Self-serve email change (User Management REST)

| Step | Endpoint |
| --- | --- |
| Send code | `POST /user_management/users/{id}/email_change/send` with `{ "new_email": "…" }` |
| Confirm | `POST /user_management/users/{id}/email_change/confirm` with `{ "code": "…" }` |

Introduced as a **self-serve** flow: user must verify the **new** address before the email is updated ([Self-serve Change Email API](https://workos.com/changelog/self-serve-change-email-api), [Email Changes — Native email changes](https://workos.com/docs/authkit/email-changes)).

Still callable with the environment API key against any `{id}`, but the product intent is ownership proof via codes — awkward for a manager who cannot read the target user’s inbox. Confirmed changes are marked **verified**; Update User direct set is **not**.

Sources: [Send email change](https://workos.com/docs/reference/authkit/user/send-email-change), [Confirm email change](https://workos.com/docs/reference/authkit/user/update) (same reference page group), [Email Changes](https://workos.com/docs/authkit/email-changes).

### B. Widgets GraphQL (User Profile)

Mutations `sendEmailChange` / `confirmEmailChange` require an **elevated access token** from `verifyCurrentEmail` for **the token subject** ([Widgets API — Send email change](https://workos.com/docs/widgets-api/users/send-email-change)). Not an admin “change another user” API.

Named failure types useful as UX vocabulary (self-serve only): `EmailNotAvailable`, `EmailManagedByProvider`, `InvalidEmail`, `DailyEmailQuotaExceeded`, etc.

### C. Users Management widget

IT contacts can invite / remove / change **roles** — docs do **not** list changing another member’s email ([Users Management widget](https://workos.com/docs/widgets/user-management)).

### D. Dashboard

Operators can change email in the WorkOS Dashboard ([changelog](https://workos.com/changelog/support-for-changing-email-addresses)) — not an app backend path.

---

## 3. Failure modes

### Taken / colliding email

| Layer | Behavior |
| --- | --- |
| **Our Convex pre-check** | `assertEmailAvailable` → throws `"Email already registered"` if another App user already has the normalized email (`convex/lib/users.ts`). Self `updateEmail` calls this via `normalizeEmailForAction` **before** WorkOS. |
| **IdP-propagated changes** | If the new email already belongs to another AuthKit user in the environment, WorkOS **skips** the email change (keeps current email; other attribute updates may still apply) — [Email Changes — Collision handling](https://workos.com/docs/authkit/email-changes). |
| **Update User REST (direct `email`)** | Reference docs do **not** document a dedicated `email_already_exists` code for PUT. Expect generic validation / request failures (`400` / `422`) per [Errors](https://workos.com/docs/reference/errors). Widgets self-serve exposes `EmailNotAvailable` for the GraphQL path. **Practical guidance:** keep Convex uniqueness first; treat non-OK WorkOS responses as hard failure (as self path does today); do not assume silent skip for admin PUT. |

### Unverified email

Direct Update User → `email_verified: false` ([Update User params](https://workos.com/docs/reference/authkit/user/update), [Email Changes](https://workos.com/docs/authkit/email-changes)). Target must verify on next auth. Optionally set `email_verified: true` on the PUT (documented escape hatch for migration / previously verified addresses) — product guidance prefers the verification flow.

### IdP / enterprise-managed user

Email changes via Update User **and** native self-serve are **rejected** when the user is directory-/SSO-managed ([changelog](https://workos.com/changelog/support-for-changing-email-addresses), [Email Changes](https://workos.com/docs/authkit/email-changes)). Widgets surface this as `EmailManagedByProvider`. Manager Save must surface a clear conflict, not retry blindly.

### Rate limits

| Limit | Value |
| --- | --- |
| General (all APIs) | 6,000 requests / 60 seconds **per API key** |
| AuthKit User Management **writes** (`/user_management/*`) | **500 requests / 10 seconds** (per environment) |
| AuthKit User Management **reads** | 1,000 / 10 seconds |
| Email verification **send** | 3 / 60 seconds **per user** (`/user_management/:id/email_verification/send`) |
| Exceeded | HTTP **`429`** |

Sources: [Rate limits](https://workos.com/docs/reference/rate-limits), [Errors](https://workos.com/docs/reference/errors).

Manager single-user Save is well under write limits; only bulk scripts need care. If using self-serve send/confirm or `email_verification/send`, tighter per-user email send limits apply.

### Other HTTP failures (Update User)

| Status | Meaning ([Errors](https://workos.com/docs/reference/errors)) |
| --- | --- |
| `401` | Invalid API key |
| `403` | Insufficient permissions |
| `404` | User not found |
| `400` / `422` | Bad / invalid parameters |
| `5xx` | WorkOS server error |

Repo self path today: any non-OK → log body + generic `"Failed to update email. Please try again."` (`convex/usersActions.ts`).

### Post-WorkOS Convex sync failure

Self path: WorkOS succeeds then `patchEmailInternal` fails → error that WorkOS updated but app did not sync (user must re-sign-in / support). Manager write API should keep the same **WorkOS-first then Convex mirror** ordering and the same split-brain messaging, or explicitly choose a different transaction strategy in grilling.

---

## 4. Comparison to existing self `usersActions.updateEmail`

Source of truth in-repo: `convex/usersActions.ts` (`updateEmail`), `convex/users.ts` (`normalizeEmailForAction`, `patchEmailInternal`), `convex/lib/users.ts` (`assertEmailAvailable`), `convex/lib/workosApi.ts` (GET profile helper).

| Aspect | Self `updateEmail` today | Manager updates **another** user |
| --- | --- | --- |
| WorkOS HTTP | `PUT …/user_management/users/${user.workosUserId}` + `{ email }` | **Identical** API; swap target `workosUserId` to the **edited** App user’s stored id |
| Credential | `process.env.WORKOS_API_KEY` | Same |
| Who may call | Any authenticated principal (identity required); no role gate in the action | Needs app-level authz (map defers Super admin \| Manager — RAD-70); WorkOS does not enforce “manager” |
| Target selection | `getUserByTokenForAction(identity.tokenIdentifier)` → self row | Load App user by Convex `_id` (or equivalent); require `workosUserId`; never trust client-supplied WorkOS id alone without ownership/authz checks |
| Convex uniqueness | `assertEmailAvailable(..., excludeUserId: self)` | Same helper with `excludeUserId: target` |
| Convex patch | `patchEmailInternal` keyed by **caller** `tokenIdentifier` | Need a patch by **target** user id / target `tokenIdentifier` (current internal mutation is self-shaped) |
| Unchanged email | Throws `"Email is unchanged"` | Same rule is fine |
| Missing WorkOS id | Throws re-provision message | Same; block Save |
| Missing API key | Throws config error | Same |

**Implication for User detail Save (charting lock: update Convex AND WorkOS):** reuse the Update User call pattern; do **not** invent a new WorkOS product API. New work is Convex action shape (target user + authz) and an internal patch that updates the **target** row after WorkOS succeeds — not a different WorkOS credential model.

**Prefer Update User over email_change send/confirm** for manager Save unless product wants the target user to prove inbox ownership before the change sticks (slower UX; verified email; codes to the *new* address).

---

## 5. Open gaps (docs / product)

1. Exact WorkOS error body / code when Update User `email` collides with an existing AuthKit user is **not** spelled out in the Update User reference (unlike Widgets `EmailNotAvailable` and IdP “skip” collision rules). Implementation should log `response.status` + body (already done for self) and map known cases once observed in staging.
2. Whether this environment has (or will have) IdP-managed users affects how often “email managed by provider” appears; SaaS-starter today is primarily AuthKit password/social — still handle the reject path.
3. Setting `email_verified: true` on admin change is technically available but fights WorkOS guidance; grilling should decide if managers may “force verified.”

---

## Sources (primary)

### WorkOS

- https://workos.com/docs/reference/authkit/user/update
- https://workos.com/docs/reference/authkit/user/send-email-change
- https://workos.com/docs/authkit/email-changes
- https://workos.com/changelog/support-for-changing-email-addresses
- https://workos.com/changelog/self-serve-change-email-api
- https://workos.com/blog/may-2025-updates
- https://workos.com/docs/reference/api-authentication
- https://workos.com/docs/reference/errors
- https://workos.com/docs/reference/rate-limits
- https://workos.com/docs/widgets-api/users/send-email-change
- https://workos.com/docs/widgets/user-management
- https://workos.com/docs/widgets/user-profile

### This repo

- `convex/usersActions.ts` — `updateEmail`
- `convex/users.ts` — `normalizeEmailForAction`, `patchEmailInternal`
- `convex/lib/users.ts` — `assertEmailAvailable`
- `convex/lib/workosApi.ts` — GET `/user_management/users/{id}`
- `docs/CONVEX_WORKOS_PRODUCTION_EPOCH.md` — email update notes
