# Research: WorkOS API create user vs AuthKit sign-up

**Ticket:** [RAD-125](https://linear.app/radi-dev/issue/RAD-125/research-workos-api-create-user-vs-authkit-sign-up)  
**Parent map:** [RAD-117](https://linear.app/radi-dev/issue/RAD-117/wayfinder-create-user-handoff) (Create User handoff)  
**Question:** How does WorkOS behave when we create an Auth user via API (manager Create User) versus AuthKit self sign-up, and is there a clear/simple out-of-the-box invite path worth including in Create User MVP?

---

## Verdict

**MVP should: `createUser` (email ± names, no password) + `sendInvitation` (email only, no organization).**

| Step | Why |
| --- | --- |
| `POST /user_management/users` | Gives a stable WorkOS `user.id` immediately so Convex can store required `workosUserId` (+ derived `tokenIdentifier`) in the all-or-nothing Create write. |
| `POST /user_management/invitations` with `{ "email" }` only | One call; **WorkOS sends the invite email by default**. Application-wide invites (no `organization_id`) are documented. This is the simple OOTB “notify the person” path. |

**Do not** rely on create-only with no email: an API-created user with no password cannot complete AuthKit email/password sign-in until they set a password (invite acceptance or password-reset flow).

**AuthKit self sign-up** remains a separate path that also ends in a WorkOS user + our Convex `store` / `provisionUser` upsert by `tokenIdentifier`. Manager Create must pre-create the WorkOS user (and App user) so first login **matches** that row instead of inserting a duplicate.

Residual risk to validate in staging (call out for write-API grill): invite-after-`createUser` for the same email with **no** organization — docs emphasize org invites for “existing user” heavily; app-wide + pre-created user should be smoke-tested once.

---

## 1. Create User API

### Endpoint

| Item | Value |
| --- | --- |
| Method / path | `POST /user_management/users` |
| Auth | `Authorization: Bearer sk_…` (same `WORKOS_API_KEY` we already use for email update) |
| SDK | `workos.userManagement.createUser({ email, password?, firstName?, lastName?, emailVerified?, … })` |

### Request fields (create)

| Field | Required | Notes |
| --- | --- | --- |
| `email` | **Yes** | |
| `password` | No | Omit for manager Create (person sets password later). |
| `first_name` / `last_name` | No | Map from optional Create form names. |
| `email_verified` | No | Docs: normally use verification flow; may set `true` only for migration / already-verified cases. Default for manager Create: leave unset / `false`. |
| `password_hash` (+ type) | No | Migration only; not for MVP. |

### Response

User object includes at least: `id` (e.g. `user_01…`), `email`, `email_verified`, names, timestamps. **`id` is what we store as `workosUserId`.** Our provision path already treats Convex `identity.subject` as that WorkOS user id (`convex/users.ts` `store` / `usersActions.provisionUser`).

Sources:

- [Create a user](https://workos.com/docs/reference/authkit/user/create) — `POST /user_management/users` parameters and example (email-only create shown in several SDK samples).
- Repo: `convex/users.ts` (`workosUserId = identity.subject`), `convex/usersActions.ts` (`provisionUser`).

---

## 2. Sign-in readiness after API create (no password, no invite)

| AuthKit path | Expected result after bare `createUser` |
| --- | --- |
| Email + password sign-in | **Fails / cannot complete** — no password set. |
| Self sign-up with same email | Should hit “user already exists” (or equivalent) rather than creating a second WorkOS user — exact error UX is AuthKit-hosted. |
| Magic Auth / OTP (if enabled in dashboard) | Possibly usable without password; **not** assumed for this app’s current email/password AuthKit setup. |
| Password reset confirm | After a reset completes, password is set and email can be marked verified ([Reset the password](https://workos.com/docs/reference/authkit/password-reset)). |

**Conclusion:** bare create-only leaves a WorkOS row the person cannot usefully sign into via our current AuthKit password UX. MVP needs an email path (invite or reset).

Sources: Create User params (password optional) — [Create a user](https://workos.com/docs/reference/authkit/user/create); password reset verify behavior — [Password reset](https://workos.com/docs/reference/authkit/password-reset).

---

## 3. Invite / magic link / password-reset (OOTB email)

### A. Invitations (recommended for MVP)

| Item | Value |
| --- | --- |
| API | `POST /user_management/invitations` — `sendInvitation({ email, organizationId?, … })` |
| Required | `email` only |
| Email delivery | **WorkOS sends invite email by default**; custom emails optional via dashboard + events |
| App-wide | Omit `organization_id` → invitation to join the **application** (documented) |
| Closed registration | If sign-up is disabled in AuthKit, a valid invitation code **re-opens** registration for that invite |

Behavior summary from product docs:

- Invitations work for **new and existing** users (org-centric flows documented in detail).
- Accepting soon after send counts as **email verification** (`email_verified`).
- Default emails can be turned off; then you send `accept_invitation_url` yourself ([Custom emails](https://workos.com/docs/authkit/custom-emails)).

**Why this is “clear and simple” for us:** one API call, default email, no custom mailer required, aligns with manager “create someone and tell them.”

Sources:

- [Send an invitation](https://workos.com/docs/reference/authkit/invitation/send)
- [Invitations (AuthKit)](https://workos.com/docs/authkit/invitations)
- [Custom emails](https://workos.com/docs/authkit/custom-emails)

### B. Password reset API (fallback, not first choice)

| Item | Value |
| --- | --- |
| API | `POST /user_management/password_reset` with `{ email }` |
| Returns | `password_reset_token`, `password_reset_url` (points at **your** configured reset URL) |
| Email | Default AuthKit password-reset emails exist; if defaults are off, **you** must email `password_reset_url` yourself |

This fits “user already exists, need to set password,” but is a worse primary MVP story than invitation (reset UX vs invite-to-join; URL must match app routing). Prefer invitation; keep reset as fallback if invite-after-create misbehaves in staging.

Sources: [Create a password reset token](https://workos.com/docs/reference/authkit/password-reset/create), [Custom emails — password reset](https://workos.com/docs/authkit/custom-emails).

### C. Magic Auth

Separate AuthKit feature (email OTP). Not required for MVP if invite covers onboarding; only relevant if dashboard enables Magic Auth as a sign-in method.

---

## 4. `tokenIdentifier` / Convex link

### How our app links today

| Field | Source today |
| --- | --- |
| `workosUserId` | `identity.subject` (WorkOS user id) |
| `tokenIdentifier` | `identity.tokenIdentifier` from Convex JWT auth |
| Upsert key | `by_token` on `tokenIdentifier` (`upsertUserFromProfile`) |

Convex defines `tokenIdentifier` as a stable global id derived from JWT **`sub` + `iss`** (not `sub` alone).

Our `convex/auth.config.ts` accepts two WorkOS issuers:

1. `https://api.workos.com/` (+ `applicationID` = client id)
2. `https://api.workos.com/user_management/${clientId}`

Live AuthKit access-token `iss` values have varied across SDK versions (trailing slash / path differences show up in community reports). **Do not invent `tokenIdentifier` blindly without matching the issuer your deployment actually issues.**

### What Create should store

1. **`workosUserId`** = `user.id` from `createUser` (authoritative).
2. **`tokenIdentifier`** = construct with the issuer string that matches the provider entry your AuthKit JWTs actually use, in Convex’s `iss` + `sub` combination form — **confirm once against a real session JWT in this project’s WorkOS environment** during write-API implementation.
3. **Provision safety (recommended follow-through on RAD-119):** on sign-in upsert, if `by_token` misses, also find by `workosUserId` (or email) and **patch** `tokenIdentifier` to the live identity. Prevents duplicate App users if issuer construction was wrong.

Sources:

- [Convex — auth in functions](https://docs.convex.dev/auth/functions-auth) (`tokenIdentifier` = subject + issuer)
- [Convex — AuthKit](https://docs.convex.dev/auth/authkit)
- Repo: `convex/auth.config.ts`, `convex/lib/upsertUser.ts`, `convex/users.ts`

---

## 5. Collision: API create vs AuthKit sign-up

| Sequence | Likely WorkOS behavior | Our Convex risk |
| --- | --- | --- |
| Manager Create → `createUser` + invite → person accepts / signs in | Same WorkOS `user.id`; JWT `sub` matches stored `workosUserId` | `store` / `provisionUser` should **update** existing row if `tokenIdentifier` matches (or via workosUserId fallback). |
| Manager Create → person uses AuthKit **sign-up** instead of invite | Email already registered → AuthKit should not create a second user | Same |
| Person AuthKit sign-up **first**, then manager Create `createUser` | `createUser` fails on duplicate email | Surface as Create validation error (“Email already registered”) — same class as Convex email uniqueness. |
| Create App+Auth, person never accepts invite | WorkOS user exists; cannot password-sign-in until invite/reset | Acceptable; resend invite is RAD-124 / later UX. |

**Duplicate App user** is our bug if provision only keys on `tokenIdentifier` and Create guessed the wrong issuer. Mitigate with workosUserId/email fallback on provision (above).

---

## 6. Recommendation for MVP (map / RAD-119 / RAD-124)

### Include in Create User MVP (RAD-117 / RAD-119)

1. WorkOS **`createUser`** — email required; optional first/last; **no** password; do not force `email_verified: true` unless product later decides managers vouch for email.
2. WorkOS **`sendInvitation`** — `{ email }` only (no organization) so WorkOS sends the default invite email.
3. Convex insert with required `workosUserId` + `tokenIdentifier`, all-or-nothing rollback per map Notes (WorkOS create first; compensate on Convex failure; if invite send fails after both creates, **fail the operation** and roll back — invite is part of MVP success if we adopt this verdict).
4. Provision hardening: match by `workosUserId` / email on first login if `tokenIdentifier` differs.

### Leave on RAD-124 (or later)

- Resend invite UX, revoke/expire copy, custom email templates / turning off WorkOS default emails.
- Organization-scoped invites / roles on invite.
- Magic Auth as primary onboarding.
- Fancy “invite without pre-creating WorkOS user” (incompatible with required Auth fields at Create time unless we reopen schema).

### Soft-reopen outcome vs earlier charting lock

Earlier lock “create Auth record only, no invite” is **superseded** by this research under the product rule: *if WorkOS supports a clear, simple invite out of the box, include it.* It does (`sendInvitation` + default email).

---

## Sources (primary)

- [Create a user](https://workos.com/docs/reference/authkit/user/create)
- [Send an invitation](https://workos.com/docs/reference/authkit/invitation/send)
- [Invitations (AuthKit guide)](https://workos.com/docs/authkit/invitations)
- [Password reset](https://workos.com/docs/reference/authkit/password-reset)
- [Custom emails](https://workos.com/docs/authkit/custom-emails)
- [Convex AuthKit](https://docs.convex.dev/auth/authkit)
- [Convex auth in functions](https://docs.convex.dev/auth/functions-auth)
- Repo: `convex/auth.config.ts`, `convex/users.ts`, `convex/usersActions.ts`, `convex/lib/upsertUser.ts`
