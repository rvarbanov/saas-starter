# Create User

- **Map:** https://linear.app/radi-dev/issue/RAD-117/wayfinder-create-user-handoff
- **Packed:** 2026-09-20
- **Status:** packed
- **Source children:** RAD-118, RAD-125, RAD-119, RAD-120, RAD-121, RAD-122, RAD-123

Language follows [`CONTEXT.md`](../../CONTEXT.md): **Create User** (manager pathway) ≠ AuthKit self sign-up. **App user** / **Auth user** / **Users list** / **User detail** (not Profile) as defined there.

## Destination

A later build session implements **Create User**: from the Users list, a **Create user** control opens `/dashboard/users/new`; the manager creates an **App user** and matching **Auth user** in one all-or-nothing flow (email required — unique + valid; optional first name, last name, assignable roles), including WorkOS `createUser` plus best-effort `sendInvitation`; on App/Auth failure the creator sees an error and can retry; invite-send failure does not roll back the user (`inviteSent: false` + User detail banner); Cancel returns to the Users list; success navigates to **User detail** for the new `_id`. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the build — this packed file is decision-complete; it does not implement UI.

After pack, **this file wins** over Linear map summaries and child issue bodies.

## Out of scope

- Implementing UI inside the Wayfinder map effort (plan-only; build is a later session / epic)
- Invite **resend** / custom email templates / org-scoped invites — [RAD-124](https://linear.app/radi-dev/issue/RAD-124/grill-workos-invite-resend-and-email-customization)
- Self **Profile** redesign; AuthKit sign-up changes unrelated to manager Create
- Directory / Create **authorization** lockdown (Super admin | Manager) — deferred with [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager)
- App user **delete**; Users list Load more; new App user fields not already on the table
- Making Auth-link fields optional / unlinked App users ([RAD-118](https://linear.app/radi-dev/issue/RAD-118/schema-optional-auth-link-fields-on-app-user) decided: no)
- Idempotent create / duplicate-submit hardening — post-MVP [RAD-127](https://linear.app/radi-dev/issue/RAD-127/idempotent-create-user-and-user-detail-save)
- Toast notifications for success/fail
- Extract shared Create/Edit form component and view/edit route split — [RAD-126](https://linear.app/radi-dev/issue/RAD-126/refactor-user-detail-into-separate-view-and-edit-routes)
- E2E teardown of created WorkOS/App users; invite-failed banner assertion; dirty-gate / Creating… / hard-fail / names+roles happy-path E2E (see RAD-122 outs)

## Decisions

### Charting locks (carry forward)

- Entry: Users list (`/dashboard/users`); button **Create user** always on the list page.
- Route: `/dashboard/users/new` (plural `users`).
- Create is **all-or-nothing** across App user + Auth user (WorkOS) only. Invite send is **best-effort**.
- Auth-link fields stay **required** (`tokenIdentifier`, `workosUserId`). No schema widening.
- WorkOS MVP: `createUser` (email ± names, **no** password) then `sendInvitation` (`{ email }` only, no organization).
- Form: email required; firstName / lastName / roles optional. Roles UI mirrors User detail (`manager` | `team_member`; no `super_admin`; empty OK).
- Validation: reuse existing email helpers + name trim/max length; no new “valid name” grammar.
- Cancel → Users list. Success → User detail for new `_id`.
- Breadcrumbs: Dashboard → Users → Create user.
- Authz interim: any signed-in JWT (same as User detail) until RAD-70.
- Build prerequisite: User detail already built — Create does not stub detail.

### Schema: Auth link fields stay required (RAD-118)

- Do **not** make `tokenIdentifier` / `workosUserId` optional.
- Create User remains all-or-nothing App + Auth; no half-created App user without Auth links.

### Research: WorkOS create vs AuthKit sign-up (RAD-125)

- **MVP = `createUser` + `sendInvitation`** (default WorkOS invite email).
- Artifact: [`docs/research/workos-api-create-user-vs-authkit-signup.md`](../research/workos-api-create-user-vs-authkit-signup.md).
- Supersedes earlier “create Auth record only / no invite” charting lean.
- Residual staging risk: invite-after-`createUser` with no organization — smoke-test once at build.

### Create User write API (RAD-119)

**Public surface**

| | |
| --- | --- |
| **Endpoint** | `api.usersActions.createUser` (action; client calls only this; mirrors `updateUserDetail`) |
| **Args** | `{ email: string, firstName?: string, lastName?: string, roles?: Role[] }` |
| **Email** | Required; validate/normalize via existing helpers — creator-facing `"Invalid email address"`, `"Email already registered"` |
| **Names** | Omit or empty → stored unset; existing normalize / max-length rules |
| **Roles** | Omit → `[]`; only `manager` \| `team_member` via `assertAssignableRoles` (reject `super_admin`) |
| **Returns** | `{ user: PublicUserDoc, inviteSent: boolean }` — `user` same public doc validator as User detail |

**Order & rollback**

1. Validate (no writes).
2. WorkOS `createUser` (email ± names; **no** password; `emailVerified` unset/false).
3. Convex insert with required `workosUserId` + constructed `tokenIdentifier` (+ `appUserId` via `crypto.randomUUID()` like provision).
4. WorkOS `sendInvitation({ email })` only (no organization).

- If step 3 fails after step 2 → **delete** WorkOS user, throw.
- If step 4 fails → **keep** App+Auth; log server-side; return `inviteSent: false` (do not throw).
- App/Auth hard failures → throw; no half-created App user.

**WorkOS HTTP**

- Extend `convex/lib/workosApi.ts` (raw `fetch` + `WORKOS_API_KEY`): `createWorkOsUser`, `sendWorkOsInvitation`, `deleteWorkOsUser` (rollback). No new SDK for MVP.

**`tokenIdentifier` + provision**

- At Create: `workosUserId` = WorkOS `user.id`; `tokenIdentifier` = Convex-style issuer+subject using the **live** AuthKit JWT `iss` for this project (confirm at build by decoding a real session); document the chosen `iss` in the PR / commit notes if not already obvious from `convex/auth.config.ts`.
- On `store` / `provisionUser`: if `by_token` misses → lookup by `workosUserId` and **patch** `tokenIdentifier`. Add `by_workosUserId` index on `users` if missing (`convex/schema.ts` today has `by_token`, `by_email`, `by_app_user_id`, `by_updatedAt` only).

**Creator-facing errors**

- `"Not authenticated"` (match existing auth helper wording if different)
- Reuse: `"Invalid email address"`, `"Email already registered"`, name-length / assignable-roles messages as today
- WorkOS create / Convex insert / rollback hard fail → `"Failed to create user. Please try again."` (details in server logs only)

### Users list Create entry, route, and breadcrumbs (RAD-120)

**Users list entry**

- **Create user** in `UsersList` (`components/users-list.tsx`), own row above the toolbar (right-aligned); Users page keeps a lone `h1`.
- Default shadcn `Button`, composed as a real Next `Link` (`render` + `nativeButton={false}` — match User detail Edit / repo Button-as-Link pattern).
- Always visible (outside list loading / empty / error UI).
- `data-testid="create-user-entry"`.

**Routes & helpers** (`lib/app-routes.ts`)

- `APP_ROUTES.usersNew` + `createUserPath()` → `/dashboard/users/new`.
- Success: existing `userDetailPath(id)`.
- `RESERVED_ROUTE_SEGMENTS = ["new", "edit"]` + `isReservedRouteSegment`; `parseUserDetailId` returns null for reserved segments (today it only rejects multi-segment paths — extend).
- Convention: create = `…/new`; edit = `…/:id/edit` (edit page split → RAD-126, not this MVP).

**Create page chrome**

- `app/dashboard/users/new/page.tsx`; title + `h1` **Create user**; `data-testid="create-user-page"`.
- Breadcrumbs: Dashboard → Users → Create user.

### Create User page UI contract (RAD-121)

**Fields (shared with User detail edit)**

- Order: **First name** → **Last name** → **Email** → **Roles**.
- Roles: assignable checkboxes only (`manager` | `team_member`); empty OK; no `super_admin`.
- Labels match User detail (no required asterisk in MVP).
- Create and Edit must stay identical on field set, order, labels, checkboxes, client validation, and submit dirty-gating; **extract shared form after MVP** (RAD-126).

**Validation & errors**

- Client validation **on submit only**, same rules/strings as User detail (`Invalid email address`; first/last max length via existing helpers).
- Single form-level `role="alert"` (`data-testid="create-user-error"`) for client + action errors (e.g. duplicate email, `Failed to create user. Please try again.`).

**Submit & Cancel**

- Primary: **Create user** (`data-testid="create-user-submit"`).
- Dirty gate shared with Edit: initial draft = empty names/email + no roles; submit disabled until draft ≠ initial; also disabled while pending.
- Pending: disable all inputs, roles, Cancel, submit; label **Creating…**.
- Cancel: outline `Button` as real `Link` to Users list (`data-testid="create-user-cancel"`); Link vs `router.push` app-wide pattern → RAD-126.

**Success & invite warning**

- Call `usersActions.createUser`.
- On success: `router.replace` to User detail for `user._id`.
- If `inviteSent === false`: append `?invite=failed`; User detail shows dismissible banner (`data-testid="user-detail-invite-failed-banner"`) with dismiss (`data-testid="user-detail-invite-failed-dismiss"`) that removes `invite` from the URL.
- Banner copy: **User created, but the invite email could not be sent. You can resend it later.** (Resend → RAD-124).

**Test ids (page/form — RAD-121; fields — RAD-122)**

| testid | Purpose |
| --- | --- |
| `create-user-entry` | Users list Create entry |
| `create-user-page` | Create page root |
| `create-user-form` | Form |
| `create-user-email` | Email input |
| `create-user-first-name` | First name |
| `create-user-last-name` | Last name |
| `create-user-role-manager` | Manager checkbox |
| `create-user-role-team_member` | Team member checkbox |
| `create-user-submit` | Submit |
| `create-user-cancel` | Cancel → list |
| `create-user-error` | Form-level alert |
| `user-detail-page` | Reuse — happy-path landing |
| `user-detail-invite-failed-banner` | Invite-failed banner on User detail |
| `user-detail-invite-failed-dismiss` | Dismiss control for that banner |

### E2E expectations for Create User build (RAD-122)

**Format:** named scenario checklist + locked `data-testid`s (no Playwright source in this handoff).

**Organization & bar**

- New `tests/e2e/create-user.spec.ts` on the **authenticated** Playwright project for **P–S** (add to `testMatch` in `playwright.config.ts`).
- Keep shell **A–J** + User detail **K–O** green.
- Acceptance command: `pnpm test:e2e` / `make e2e` (not `e2e-prod`).
- Desktop Chromium only.
- **Live WorkOS** (existing E2E secrets / test Auth env). Fail-fast if secrets missing. Do **not** mock WorkOS for Create Acceptance.

**Acceptance scenarios**

| ID | Scenario |
| --- | --- |
| **P** | Users → `create-user-entry` → `/dashboard/users/new` + `create-user-page` → fill `create-user-email` with `e2e-create+<timestamp>@example.com` only → submit → User detail (`user-detail-page`) showing that email. Do **not** assert invite-failed banner either way. |
| **Q** | Create: invalid email (e.g. `not-an-email`) → submit → `create-user-error` with `Invalid email address`; stay on Create. |
| **R** | Create: email = `E2E_WORKOS_EMAIL` → submit → `create-user-error` (duplicate / already registered); stay on Create. |
| **S** | Create: Cancel (`create-user-cancel`) → Users list. |

**Explicitly out of Acceptance**

- `?invite=failed` / invite-failed banner assert
- Dirty-gate / Creating… / App+Auth hard-fail messaging
- Names + roles happy path; separate breadcrumbs-only case
- **Teardown** of created WorkOS/App users — orphans OK for v1; cleanup debt → [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete)

**Secrets:** existing E2E secrets unchanged (`E2E_WORKOS_EMAIL`, `E2E_WORKOS_PASSWORD`, WorkOS cookie/API keys). Fail-fast if missing.

## Build checklist

1. **WorkOS helpers:** Extend `convex/lib/workosApi.ts` with `createWorkOsUser`, `sendWorkOsInvitation`, `deleteWorkOsUser` (RAD-119 / RAD-125).
2. **Schema index:** Add `users` index `by_workosUserId` (`workosUserId`) if provision fallback needs it; update `convex/schema.ts`.
3. **Write API:** Implement `api.usersActions.createUser` in `convex/usersActions.ts` with all-or-nothing App+Auth and best-effort invite (RAD-119). Wire provision/`store` fallback by `workosUserId`. Confirm live JWT `iss` for `tokenIdentifier` construction.
4. **Deploy Convex:** Human runs `pnpm convex:dev` (or equivalent) against the shared deployment so live functions match source. Agent does not use production `convex deploy` unattended.
5. **Routes helpers:** Add `APP_ROUTES.usersNew`, `createUserPath()`, `RESERVED_ROUTE_SEGMENTS`, `isReservedRouteSegment`; harden `parseUserDetailId` against `new` / `edit` in `lib/app-routes.ts` (RAD-120).
6. **Users list entry:** Add always-visible **Create user** Link button + `create-user-entry` in `components/users-list.tsx` (RAD-120).
7. **Create page:** Add `app/dashboard/users/new/page.tsx` + client form per RAD-121/122 (fields, dirty gate, Creating…, errors, testids); breadcrumbs Dashboard → Users → Create user.
8. **Invite-failed banner:** On User detail, honor `?invite=failed` with dismissible banner + testids (RAD-121). Do not invent resend UI (RAD-124).
9. **E2E:** Add `tests/e2e/create-user.spec.ts` for **P–S**; register in Playwright `authenticated` project; keep **A–O** green (RAD-122).
10. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e` / `make e2e`.

## Acceptance criteria

- [ ] Product: Create entry, `/dashboard/users/new`, breadcrumbs, form/roles/dirty-gate/pending, `usersActions.createUser` all-or-nothing + best-effort invite, success → User detail, `?invite=failed` banner when `inviteSent === false`, Cancel → list — match **Decisions** above
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] E2E: scenarios **P–S** in `tests/e2e/create-user.spec.ts`; shell **A–J** + User detail **K–O** still pass; bar = `pnpm test:e2e` / `make e2e`

## Open / deferred

**Soft defaults (do not re-grill; invent only within these):**

- Visual layout: follow existing App / User detail patterns (no new design system). Prefer shadcn primitives already in the repo; add via `pnpm exec shadcn add …` only if a Decision requires a control not already present.
- Button-as-Link API: use whatever the installed shadcn `Button` version exposes (`render` / `nativeButton={false}` or current equivalent) — match User detail Edit / list patterns already in tree.
- Unique E2E email local-part: `e2e-create+<timestamp>@example.com` as locked; WorkOS may attempt delivery to that address — acceptable for Acceptance.
- `"Not authenticated"` vs existing helper string: prefer the repo’s existing auth error wording if it already differs slightly.

**Linear debt (do not invent in this build):**

- [RAD-124](https://linear.app/radi-dev/issue/RAD-124/grill-workos-invite-resend-and-email-customization) — invite resend + email customization (separate WorkOS Auth-link / invite grill)
- [RAD-126](https://linear.app/radi-dev/issue/RAD-126/refactor-user-detail-into-separate-view-and-edit-routes) — shared form extract; view/edit routes; Cancel Link vs push; required-field affordances
- [RAD-127](https://linear.app/radi-dev/issue/RAD-127/idempotent-create-user-and-user-detail-save) — idempotent Create + User detail Save
- [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager) — directory / Create authz
- [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete) — E2E subject via create → get → update → delete (includes teardown)
- Toast notifications — post-MVP, no ticket required to skip

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-117/wayfinder-create-user-handoff
- Assemble: https://linear.app/radi-dev/issue/RAD-123/assemble-create-user-handoff-spec
- Children: [RAD-118](https://linear.app/radi-dev/issue/RAD-118/schema-optional-auth-link-fields-on-app-user), [RAD-125](https://linear.app/radi-dev/issue/RAD-125/research-workos-api-create-user-vs-authkit-sign-up), [RAD-119](https://linear.app/radi-dev/issue/RAD-119/create-user-write-api), [RAD-120](https://linear.app/radi-dev/issue/RAD-120/users-list-create-entry-route-and-breadcrumbs), [RAD-121](https://linear.app/radi-dev/issue/RAD-121/create-user-page-ui-contract), [RAD-122](https://linear.app/radi-dev/issue/RAD-122/e2e-expectations-for-create-user-build)
- Research artifact: [`docs/research/workos-api-create-user-vs-authkit-signup.md`](../research/workos-api-create-user-vs-authkit-signup.md)
- Prior handoff: [`docs/handoffs/user-detail.md`](./user-detail.md)
- CONTRACT: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
