# User detail

- **Map:** https://linear.app/radi-dev/issue/RAD-86/wayfinder-user-detail-handoff
- **Packed:** 2026-09-15
- **Status:** packed
- **Source children:** RAD-87, RAD-88, RAD-91, RAD-92, RAD-89, RAD-93, RAD-90, RAD-94, RAD-95

Language follows [`CONTEXT.md`](../../CONTEXT.md): **User detail** (manager path from Users list) ≠ **Profile** (self, Avatar menu). **App user** / **Listed user** / **Users list** as defined there.

## Destination

A later build session implements **User detail**: from the Users list, open an App user at `/dashboard/users/[userId]`, view the full public App user doc (including identity-link fields), enter edit mode to change `firstName` / `lastName` / `email` / `roles`, Save (exit edit; reactive refresh) or Cancel (discard drafts), with breadcrumbs Dashboard → Users → person. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the build — this packed file is decision-complete; it does not implement UI.

Build work is tracked under **[[Epic] User detail](https://linear.app/radi-dev/issue/RAD-96/epic-user-detail)**. After pack, **this file wins** over Linear map summaries and child issue bodies.

## Out of scope

- Implementing UI inside the Wayfinder map effort (plan-only; build is a later session / epic)
- Self **Profile** redesign (`/dashboard/profile`) beyond keeping it separate from User detail
- New App user fields (e.g. phone) not already on the Convex `users` table
- Directory / User detail **authorization** lockdown (Super admin | Manager) — deferred; see [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager)
- Role add/remove limited to admins — deferred; see [RAD-113](https://linear.app/radi-dev/issue/RAD-113/restrict-role-addremove-to-admins)
- Inventing Users list search/filter (already shipped — [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter)); E2E reuses it
- Users list Load more UI, Admin section, multi-tenant team UI, dark theme
- Playwright cases beyond scenarios **K–O** and keeping shell **A–J** green (no email-mutation E2E, no roles E2E, no failure-path E2E in this map)

## Decisions

### Charting locks (carry forward)

- Show **all** App user fields on User detail; **edit** only `firstName`, `lastName`, `email`, `roles`.
- Identity links (`appUserId`, `tokenIdentifier`, `workosUserId`), `_id`, timestamps, and derived `name` are **read-only**.
- Route: `/dashboard/users/[userId]` with Convex `_id`.
- Email Save updates Convex **and** WorkOS (when email changed).
- Save exits edit mode and shows fresh query data (no full browser reload).
- Authz interim: any signed-in JWT (same class as Users list) until RAD-70.

### Research: WorkOS update email for another Auth user (RAD-87)

- Manager email updates use the same WorkOS User Management **Update User** API as self `usersActions.updateEmail`:
  - `PUT https://api.workos.com/user_management/users/{user_id}` with `{ "email" }`
  - Auth: environment `WORKOS_API_KEY` (`Bearer sk_…`)
- No separate Admin email API; Widgets / Profile GraphQL email-change are wrong for manager Save.
- Target selection: subject’s `workosUserId` (not the caller’s).
- Do **not** set `email_verified: true` on manager change (WorkOS sets verified false on email change).
- Full notes: [`docs/research/workos-update-email-other-user.md`](../research/workos-update-email-other-user.md).

### User detail read API shape (RAD-88)

**`api.users.getById` is the User detail read** — not a Listed-user-by-id path.

| | |
| --- | --- |
| **Endpoint** | `api.users.getById` |
| **Args** | `{ userId: Id<"users"> }` |
| **Returns** | Full public App user doc via `userDocValidator` / `toPublicUserDoc` (same shape as `getMe`): `_id`, `appUserId`, `tokenIdentifier`, `email`, `name?`, `firstName?`, `lastName?`, `workosUserId`, `roles`, `createdAt`, `updatedAt` |
| **Missing** | `null` (do not throw for absent row) |
| **Auth** | JWT via `requireIdentity`; deny → `"Not authenticated"`. Caller need not have an App user row. |

**Supersedes** shell handoff: shell locked `getById` → Listed user. For User detail, `getById` returns the full public App user doc. Listed user floor remains on **`api.users.list` only**.

Update `convex/users.ts` + tests that still assert Listed-user shape for `getById`.

### Users list row navigation to User detail (RAD-91)

Overrides shell “no row-click.”

1. **URL:** `/dashboard/users/{_id}` from Listed user `_id`.
2. **Whole row:** entire row is the hit target; prefer a **real link** (`href`) so middle-click / open-in-new-tab work. Concrete a11y pattern (row-as-link vs stretched link) is a build choice.
3. **Own row:** signed-in user’s row → **their User detail** (not Profile). Profile stays Avatar-menu only.
4. **Affordance:** `cursor-pointer` + row hover; no “View” control / chevron / required underline.
5. **No actions column** (unchanged).

### User detail route and breadcrumbs (RAD-92)

1. **Path:** `app/dashboard/users/[userId]/…` with Convex `Id<"users">`.
2. **Breadcrumbs:** **Dashboard → Users → {leaf}**. Dashboard → `/dashboard`; Users → `/dashboard/users`; leaf is current page (non-link). Extends today’s two-segment `appBreadcrumbLeaf` / App header pattern.
3. **Leaf label (and page title if shared):** `firstName` + `lastName` (trimmed, single space) → else `name` if set → else **email** → else `"User"`.
4. **Missing / invalid id:** stay on URL; in-content **not-found** (e.g. “User not found”) with way back via Users crumb; **no** redirect; **no** bare Next.js 404 that drops App chrome. Malformed id → same UI. Aligns with `getById` → `null`.
5. **`APP_ROUTES`:** keep `users: "/dashboard/users"`; add helper e.g. `userDetail(userId)` → `/dashboard/users/${userId}`. Document detail as an allowed App route; sidebar Users `prefix` match already covers it.

### Manager write API for User detail (RAD-89)

**One** public Convex action for User detail Save; self Profile APIs stay separate.

| | |
| --- | --- |
| **Endpoint** | `api.usersActions.updateUserDetail` (action; Node / WorkOS) |
| **Args (all required every Save)** | `{ userId, firstName, lastName, email, roles }` — UI always submits current form values |
| **Self APIs** | `updateName` / `updateEmail` remain self-only — do **not** overload with `userId` |
| **Auth** | JWT `requireIdentity` only; RAD-70 deferred |
| **Missing target** | throw `"User not found"` |
| **Returns** | Updated public App user doc (`userDocValidator` / `toPublicUserDoc`), not `null` |

**All-or-nothing Save:**

1. Validate in Convex first (incl. email uniqueness excluding `userId`; name rules via `normalizeNames`; email via `assertValidEmailFormat` / `normalizeEmail`).
2. If email **changed**: WorkOS Update User PUT for target’s `workosUserId` (RAD-87).
3. If email **unchanged**: **do not** call WorkOS.
4. Only after WorkOS succeeds (or is skipped) patch Convex: names (recompute derived `name`), email if changed, roles (per RAD-93 merge rules).
5. If WorkOS fails: **do not** patch; throw clear error (e.g. `"Failed to update email. Please try again."`) with logged status/body.

**Build note:** Epic tickets RAD-98 / RAD-99 / RAD-100 must be implemented as **this one action** (or consolidated); do not ship three public client endpoints. Need internal helpers that patch the **target** user by id (today `patchEmailInternal` is self/`tokenIdentifier`-shaped).

### Roles editor on User detail (RAD-93)

**Edit mode (other user):**

- Checkboxes for assignable roles only: `manager` | `team_member`.
- `super_admin` is never a checkbox.
- Backend **rejects** any `updateUserDetail` whose `roles` array includes `super_admin`.
- **Assignable-subset replace:** `args.roles` is the desired set of `manager`/`team_member`. Server writes  
  `roles` = (existing `super_admin` on subject, if any) ∪ (validated `args.roles`).  
  Prevents accidental demotion when UI never offered `super_admin`.
- Empty assignable set (`roles: []`) allowed.
- No other v1 guardrails (no last-Super-admin checks).

**Own User detail:** roles control **read-only** (view-mode presentation). `firstName` / `lastName` / `email` remain editable.

**View mode:** plain-text role labels (humanize slug → label). Empty → see soft default below.

### User detail edit-mode UI contract (RAD-90)

**Mode machine**

- Default: **view**.
- **Edit** → edit mode; editable fields become inputs (roles per RAD-93).
- **Cancel** → discard local drafts → view.
- **Save** → `updateUserDetail` with all current form values → on success exit to view; reactive query data (no full reload).

**Pending Save:** on Save click, **full freeze** — Save, Cancel, and all inputs disabled; Save label → `"Saving…"`.

**Enablement (not pending):** Save only when dirty; Cancel always enabled.

**Save failure:** stay in edit; keep drafts; one form-level inline error (`role="alert"`, Profile-style `user-detail-error`); clear on next Save attempt.

**Client validation:** mirror local/synchronous server rules before the action — name trim + max 100 (`MAX_NAME_LENGTH`), email format/normalize, roles payload never includes `super_admin`. Uniqueness + WorkOS only via Save failure. No preflight uniqueness API.

**Unsaved navigation:** none in v1.

**Success:** silent (exit to view).

**Concurrent query while dirty:** drafts win; ignore live query updates until Cancel or successful Save.

### E2E expectations for User detail build (RAD-94)

**Format:** named scenario checklist + locked `data-testid`s (no Playwright source in this handoff).

**Organization & bar**

- New `tests/e2e/user-detail.spec.ts` on the authenticated project for **K–O**.
- Keep shell **A–J** (`tests/e2e/shell.spec.ts` + auth specs); update **H** only if row-as-link breaks assertions.
- Acceptance command: `pnpm test:e2e` / `make e2e` (not `e2e-prod`).
- Desktop Chromium only.

**testid contract**

| testid | Purpose |
| --- | --- |
| `users-search-input` | **Reuse** (Users list search) |
| `users-directory-table` | **Reuse** |
| `user-detail-page` | User detail page root |
| `user-detail-form` | Edit-mode form container |
| `user-detail-error` | Form-level inline error (`role="alert"`) |

Breadcrumbs and identity labels via accessible names / visible text.

**Acceptance scenarios**

| ID | Scenario |
| --- | --- |
| K | Users: type `E2E_WORKOS_EMAIL` into `users-search-input` → matching row → click row → `/dashboard/users/{id}` + `user-detail-page` |
| L | Breadcrumbs Dashboard → Users → leaf; **Users** crumb → list |
| M | View: full App user fields including identity links read-only |
| N | Edit first and/or last name → Save → view shows new values (same subject as K) |
| O | Edit → change name → Cancel → view unchanged |

**Not in Acceptance:** email/WorkOS mutation; other-user fixture; failure paths; not-found; roles UI.

**Secrets:** existing E2E secrets; fail-fast if missing.

## Build checklist

1. **Read API:** Widen `api.users.getById` to full public App user doc (RAD-88). Update `convex/users.ts` + unit/`convex-test` assertions. Epic: [RAD-97](https://linear.app/radi-dev/issue/RAD-97/backend-user-detail-read-api).
2. **Write API:** Implement **one** action `api.usersActions.updateUserDetail` with all-or-nothing WorkOS+Convex semantics and roles merge (RAD-89 + RAD-93). Add target-by-id internal patch helpers. Fold epic [RAD-98](https://linear.app/radi-dev/issue/RAD-98/backend-manager-update-names) / [RAD-99](https://linear.app/radi-dev/issue/RAD-99/backend-manager-update-email-workos-sync) / [RAD-100](https://linear.app/radi-dev/issue/RAD-100/backend-manager-update-roles) into this single surface.
3. **Deploy Convex:** Human runs `pnpm convex:dev` (or equivalent) against the shared deployment so live functions match source — [RAD-101](https://linear.app/radi-dev/issue/RAD-101/backend-deploy-user-detail-convex-functions). Agent does not use production `convex deploy` unattended.
4. **Routes helper:** Add `userDetail(id)` (or equivalent) in `lib/app-routes.ts`; extend breadcrumbs beyond flat `appBreadcrumbLeaf` for three segments — [RAD-102](https://linear.app/radi-dev/issue/RAD-102/ui-user-detail-route-and-breadcrumbs).
5. **Page shell:** Add `app/dashboard/users/[userId]/page.tsx` (and client components as needed) with `user-detail-page`, loading, and in-content not-found.
6. **Users list row nav:** Whole-row real link to User detail in `components/users-list.tsx` (RAD-91) — [RAD-103](https://linear.app/radi-dev/issue/RAD-103/ui-users-list-row-navigation).
7. **View mode:** Render all public fields; identity + `_id` + timestamps + derived `name` read-only; roles plain-text labels — [RAD-104](https://linear.app/radi-dev/issue/RAD-104/ui-user-detail-view-mode).
8. **Edit mode:** Edit / Save / Cancel per RAD-90 + roles per RAD-93; wire `updateUserDetail`; testids `user-detail-form` / `user-detail-error` — [RAD-105](https://linear.app/radi-dev/issue/RAD-105/ui-user-detail-edit-mode-save-cancel).
9. **E2E:** Add `tests/e2e/user-detail.spec.ts` for **K–O**; keep **A–J** green — [RAD-106](https://linear.app/radi-dev/issue/RAD-106/e2e-playwright-user-detail-acceptance).
10. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e`.

## Acceptance criteria

- [ ] Product: route, breadcrumbs, row navigation, view/edit/save/cancel, read/write APIs, and roles rules match **Decisions** above
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] E2E: scenarios **K–O** in `tests/e2e/user-detail.spec.ts`; shell **A–J** still pass; bar = `pnpm test:e2e` / `make e2e`

## Open / deferred

**Soft defaults (do not re-grill; invent only within these):**

- Empty roles view string: use **`None`** (not “No roles”).
- Role label humanization: **Super admin** / **Manager** / **Team member** (match Users list Roles column from RAD-72).
- Visual layout: follow existing App / Profile patterns (no new design system). Prefer shadcn primitives already in the repo; add via `pnpm exec shadcn add …` only if a Decision requires a control not already present (e.g. checkbox).
- Row-as-link a11y pattern: any approach that keeps a real `href` and whole-row hit target.

**Linear debt (do not invent in this build):**

- [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager) — directory / detail authz
- [RAD-113](https://linear.app/radi-dev/issue/RAD-113/restrict-role-addremove-to-admins) — only admins add/remove roles
- [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete) — E2E subject via create → get → update → delete
- [RAD-116](https://linear.app/radi-dev/issue/RAD-116/e2e-user-detail-roles-coverage) — roles E2E
- Users list Load more UI (shell open debt)

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-86/wayfinder-user-detail-handoff
- Assemble: https://linear.app/radi-dev/issue/RAD-95/assemble-user-detail-handoff-spec
- Epic: https://linear.app/radi-dev/issue/RAD-96/epic-user-detail
- Children: [RAD-87](https://linear.app/radi-dev/issue/RAD-87/research-workos-update-email-for-another-auth-user), [RAD-88](https://linear.app/radi-dev/issue/RAD-88/user-detail-read-api-shape), [RAD-91](https://linear.app/radi-dev/issue/RAD-91/users-list-row-navigation-to-user-detail), [RAD-92](https://linear.app/radi-dev/issue/RAD-92/user-detail-route-and-breadcrumbs), [RAD-89](https://linear.app/radi-dev/issue/RAD-89/manager-write-api-for-user-detail), [RAD-93](https://linear.app/radi-dev/issue/RAD-93/roles-editor-on-user-detail), [RAD-90](https://linear.app/radi-dev/issue/RAD-90/user-detail-edit-mode-ui-contract), [RAD-94](https://linear.app/radi-dev/issue/RAD-94/e2e-expectations-for-user-detail-build)
- Contract: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
- Research artifact: [`docs/research/workos-update-email-other-user.md`](../research/workos-update-email-other-user.md)
