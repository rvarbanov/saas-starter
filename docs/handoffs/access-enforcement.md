# Access enforcement (MVP 1)

- **Map:** https://linear.app/radi-dev/issue/RAD-168/wayfinder-access-enforcement-handoff
- **Packed:** 2026-10-21
- **Status:** packed
- **Source children:** RAD-169, RAD-170, RAD-171, RAD-172, RAD-173, RAD-174, RAD-175, RAD-176, RAD-177, RAD-179, RAD-181, RAD-182

Language follows [`GLOSSARY.md`](../../GLOSSARY.md): **Action**, **Role**, **ANY**, **System admin** (`SYS_ADM`), **Users admin** (`USR_ADM`), **Users manager** (`USR_MGR`), **Users viewer** (`USR_VWR`), **App user**, **Profile**, **Users list**, **User detail**, **Create User**, **Edit User**, **Delete user**, **Change kind**.

## Destination

A later build implements **Access enforcement (MVP 1)**: a code-defined nested Action catalog consulted as `can({ domain, action })` in Convex and from the App UI; Users surfaces gated (nav, routes, chrome); Profile limited to a field floor for every caller via `getMe`; role-assignment UI kept hidden with Role writes internal-only; legacy Role codes migrated (`super_admin` → `SYS_ADM`, `manager` → `USR_MGR`); Delete user authorized via `users.delete` with a `SYS_ADM`-on-subject gate. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the build — this packed file is decision-complete; it does not implement the feature.

After pack, **this file wins** over Linear map summaries and child issue bodies.

This handoff feeds build stories under [Roles and access (scoped RBAC)](https://linear.app/radi-dev/issue/RAD-152/epic-roles-and-access-scoped-rbac) (pointer hygiene only in Open/deferred — do not implement epic rewrite here).

## Out of scope

- Implementing Access enforcement inside the Wayfinder map effort (plan-only; build is a later session)
- [System actor Role code SYS_SYS for automated Changes](https://linear.app/radi-dev/issue/RAD-183)
- [Cleanup team_member Role code](https://linear.app/radi-dev/issue/RAD-180)
- Role / grant management UI and who-may-assign policy ([MVP2: Role / grant management (outline)](https://linear.app/radi-dev/issue/RAD-166), [MVP2: Relational grants + who may assign](https://linear.app/radi-dev/issue/RAD-136))
- Relational grants migration
- Internal vs public app mode ([Deferred: Internal vs public app mode for starter](https://linear.app/radi-dev/issue/RAD-167))
- Public team / membership / leadership model
- Custom Domain Roles beyond the Users starter catalog
- Authorization cache TTL / 15-minute revocation bound from the architecture doc (see Open/deferred soft default)
- Empty Roles cell display polish ([RAD-109](https://linear.app/radi-dev/issue/RAD-109))
- Profile-only / empty-roles E2E (Unauthorized on Users) — not in letters Z–AG
- App UI to strip `SYS_ADM` before Delete (ops / internal `setRoles` only in MVP 1)

## Decisions

### Users domain action catalog (RAD-169)

**Decision API:** nested `can({ domain, action })` — no flat Action string.

**Users domain** (`domain: "users"`):

| `action` | Covers |
| --- | --- |
| `list` | Users list API + Users nav |
| `read` | User detail (`getById`); not Profile |
| `create` | Create User |
| `update` | Edit User for **another** App user |
| `delete` | Delete user |
| `changes.read` | Changes on User detail |

**Profile domain** (`domain: "profile"`):

| `action` | Allows | Covers |
| --- | --- | --- |
| `self.read` | `ANY` | Own Profile read / field floor path |
| `self.write` | `ANY` | Own Profile edit |

Catalog is nested in code (e.g. `actions.users.list = [...]`, `actions.profile.self.read = ['ANY']`).

**`ANY`:** catalog sentinel — every **provisioned** App user. **Not** stored on `users.roles`.

**Empty / missing `roles`:** no Users Actions; Profile still via `ANY`.

**No silent wildcard:** every Role-gated Action lists Role codes explicitly; extend the map when adding Actions.

**Allow-lists and seed Role codes for MVP 1:** see [Expand Access enforcement Roles: System admin, Users viewer (RAD-181)](#expand-access-enforcement-roles-system-admin-users-viewer-rad-181) (supersedes RAD-169’s `ADM`/`UMG` rows).

### Foundational role codes vs DDD_RRR migration (RAD-179)

- Role codes follow `DDD_RRR` ([ADR 0003](../adr/0003-role-code-ddd-rrr-naming.md)).
- **Superseded for MVP 1 seed set and legacy map** by RAD-181: use `SYS_ADM` / `USR_ADM` / `USR_MGR` / `USR_VWR`, and `super_admin` → `SYS_ADM` (not `USR_ADM`).
- `team_member` remains a temporary stored exception until [RAD-180](https://linear.app/radi-dev/issue/RAD-180); it is not a Users catalog Role.

### Expand Access enforcement Roles: System admin, Users viewer (RAD-181)

**Canonical MVP 1 seed Roles and Users allow-lists** (list `SYS_ADM` explicitly on every Role-gated Action):

| `action` | Allows |
| --- | --- |
| `list` | `SYS_ADM`, `USR_ADM`, `USR_MGR`, `USR_VWR` |
| `read` | `SYS_ADM`, `USR_ADM`, `USR_MGR`, `USR_VWR` |
| `create` | `SYS_ADM`, `USR_ADM`, `USR_MGR` |
| `update` | `SYS_ADM`, `USR_ADM`, `USR_MGR` |
| `delete` | `SYS_ADM`, `USR_ADM` |
| `changes.read` | `SYS_ADM`, `USR_ADM`, `USR_MGR` |

Profile `self.read` / `self.write` stay **`ANY` only**.

**Legacy migration (pack + build):**

| Old stored code | Becomes |
| --- | --- |
| `super_admin` | `SYS_ADM` |
| `manager` | `USR_MGR` |
| `team_member` | unchanged until cleanup |
| empty / missing | no Users Actions |

No automatic invent of `USR_ADM` or `USR_VWR` — seed via internal `setRoles` / test principals.

**Delete + `SYS_ADM` on subject:**

- Not self → `"Cannot delete your own user"`.
- **Cannot Delete** a subject who currently holds `SYS_ADM` (any caller). Strip `SYS_ADM` first via **internal `setRoles` only** (no App role UI — RAD-173).
- Non–System admins (including Users admin) cannot remove `SYS_ADM`.
- Last `SYS_ADM` **may** be removed (ops risk accepted).
- Soft-delete behavior otherwise unchanged (see packed [`delete-user.md`](./delete-user.md)); only the **gate** and Role codes change.

### can query contract for the App UI (RAD-170)

| | |
| --- | --- |
| **Path** | `api.authz.can` in `convex/authz.ts` |
| **Args** | `{ domain, action }` — strict catalog unions; **no** `resourceId` |
| **Returns** | `boolean` |
| **No JWT** | throw `"Not authenticated"` |
| **JWT, no App user** | throw provisioning error; UI **skips** until `getMe` is non-null |
| **Unknown domain/action** | `false` |

**UI:** While `can` is pending → App chrome + skeletons; do not show Unauthorized yet; do not run gated resource queries. On `false` → Unauthorized / hide nav (RAD-171 / RAD-172). On `true` → then resource queries.

**Call pattern:** one subscription per distinct `{ domain, action }` (not per table row). Data APIs still enforce independently.

### Unauthorized empty state on gated Users routes (RAD-171)

- Signed-in principal lacks the Users Action for that surface; **URL stays**.
- Shared Content-area component on: `/dashboard/users`, `/dashboard/users/[userId]`, `/dashboard/users/new`, `/dashboard/users/[userId]/edit`.
- **Copy (exact):** heading `Unauthorized`; body `You do not have access to this page.`
- No CTA; no list of missing Actions; Global nav + Avatar menu remain.
- Unauthorized for denied `read` → Unauthorized component (**not** User not found). Allowed `read` + missing/soft-deleted subject → existing `user-detail-not-found`.
- **`data-testid`:** `unauthorized-empty`.

### Where Users nav and route gates live (RAD-172)

- Hide Users nav item when `can({ domain: "users", action: "list" })` is false (omit, not disabled).
- Gate in `app/dashboard/users/layout.tsx`. Middleware / proxy stay **session-only**. `app/dashboard/layout.tsx` = signed-in App frame only.
- Per-route Action **before** children or resource loads:

| Route | Action |
| --- | --- |
| `/dashboard/users` | `list` |
| `/dashboard/users/[userId]` | `read` |
| `/dashboard/users/new` | `create` |
| `/dashboard/users/[userId]/edit` | `update` |

- Deny → Unauthorized empty state; no page data queries. Pending → no Users body / resource fetches until `can` resolves.
- Breadcrumbs follow the URL; Content shows Unauthorized when denied.
- Principals without Users Actions may still use Dashboard home, Coming soon, Settings, and Profile.

### Hide role assignment UI for Access enforcement (RAD-173)

- No role editors on User detail, Create User, Edit User, or Profile — **read-only** Role labels only.
- Users list **role filter** stays (filter by Role code; not assignment).
- Public `createUser` / `updateUser` (and equivalents) **must not accept** `roles`. If `roles` is sent → **reject** (validation error).
- New App users keep `roles: []` until seeded.
- Role writes: **internal only** (`users.setRoles` or equivalent `internalMutation` / dashboard script).

### Profile field floor API shape (RAD-174)

- Single public `users.getMe`; **same floor for all callers**.
- **Returned fields:** `firstName`, `lastName`, `email`, `roles`, `_id` (`_id` wire-only for React keys + `updateUser({ userId })`).
- **Never return on `getMe`:** `tokenIdentifier`, `workosUserId`, `appUserId`, `createdAt`, `updatedAt`.
- Profile UI: first name, last name, email, roles label (read-only). All Roles use `profile.self.read` / `self.write` via `ANY`.
- Privileged identity links (`appUserId` / token / WorkOS) stay on **User detail** via `getById` when `can({ domain: "users", action: "read" })`.

### Fold Delete user gate into users.delete Action (RAD-175)

- Same build: authorize Delete via `can({ domain: "users", action: "delete" })`. Retire `isSuperAdmin` / `super_admin` on this path.
- UI: show Delete when that `can` is true **and** not viewing self; server still enforces all invariants.
- **Allow-list and `SYS_ADM`-on-subject gate:** RAD-181 (not “`USR_ADM` only” / not last-Administrator count).
- Soft-delete write path, dialog, and post-success navigation stay as packed in [`delete-user.md`](./delete-user.md) except Role-gate language.

### Authz glossary terms for Access enforcement (RAD-176)

- Glossary terms: **Action**, **Role**, **ANY**; Changes **Action** renamed to **Change kind**.
- Avoid product use of permission / capability / grant for these concepts in MVP 1.
- No `CONTEXT.md`. **Grant** deferred until relational storage (MVP 2).
- Role display names and codes: see `GLOSSARY.md` and RAD-181 (System admin / Users admin / Users manager / Users viewer).

### E2E expectations for Access enforcement build (RAD-177)

- Handoff format: named scenario checklist + locked `data-testid`s; **no** Playwright source in this handoff.
- Spec file: `tests/e2e/access-enforcement.spec.ts` on the authenticated Playwright project.
- Concrete letters, secrets, and skip rules: [Per-Role E2E matrix (RAD-182)](#per-role-e2e-matrix-for-access-enforcement-rad-182).
- Legacy `E2E_WORKOS_EMAIL` / `E2E_WORKOS_PASSWORD` remain for existing suites until a later migration to `E2E_SYS_ADM_*`.

### Per-Role E2E matrix for Access enforcement (RAD-182)

**Auth:** four Role `storageState` files from setup (one login per Role secret pair); `test.use({ storageState })` per describe.

**Secrets:**

| Principal | Env |
| --- | --- |
| System admin | `E2E_SYS_ADM_EMAIL` / `E2E_SYS_ADM_PASSWORD` |
| Users admin | `E2E_USR_ADM_EMAIL` / `E2E_USR_ADM_PASSWORD` |
| Users manager | `E2E_USR_MGR_EMAIL` / `E2E_USR_MGR_PASSWORD` |
| Users viewer | `E2E_USR_VWR_EMAIL` / `E2E_USR_VWR_PASSWORD` |
| Delete target (holds `SYS_ADM`) | `E2E_SYS_ADM_TARGET_EMAIL` / `E2E_SYS_ADM_TARGET_PASSWORD` |

Seed Roles via internal `setRoles` / [MVP1: Seeded test principals per access persona](https://linear.app/radi-dev/issue/RAD-164). If a scenario’s Role or AG-target secrets are unset → **skip** that scenario (do not fail-fast the whole `pnpm test:e2e` on missing new secrets).

**Playwright letters (Z–AG):**

| ID | Principal | Assert |
| --- | --- | --- |
| **Z** | System admin | Users nav + list; Create entry; Delete visible on other non-`SYS_ADM` User detail (not self) |
| **AA** | Users admin | Same Users chrome as Z |
| **AB** | Users manager | Users nav + list + Create; **no** Delete control |
| **AC** | Users manager | `/dashboard/users/{id}/edit` loads Edit User |
| **AD** | Users viewer | Users nav + list + User detail; **no** Create; **no** Delete; Changes section **absent** |
| **AE** | Users viewer | `/dashboard/users/new` → `unauthorized-empty` |
| **AF** | Users viewer | `/dashboard/users/{id}/edit` → `unauthorized-empty` |
| **AG** | Users admin | Confirm Delete on `E2E_SYS_ADM_TARGET_*` subject → failure / stay on detail; subject still listed |

Reuse existing Users / Create / Delete testids where present.

**Same-build Vitest / `convex-test` (not Playwright letters):** at least `USR_VWR` denied `create` / `update` / `delete` / `changes.read`; `USR_MGR` denied `delete`; Delete of a subject who still holds `SYS_ADM` rejected.

## Build checklist

1. **Catalog module:** Add nested Action → Role-code allow-lists (RAD-181 table + Profile `ANY`) and helpers used by `can` and server gates. No silent `SYS_ADM` / admin wildcard.
2. **`api.authz.can`:** Implement `convex/authz.ts` per RAD-170 (args, returns, auth/provisioning throws, unknown → `false`).
3. **Role code migration:** Migrate stored `super_admin` → `SYS_ADM`, `manager` → `USR_MGR` in schema, validators, labels (`lib/role-labels.ts`, Convex roles helpers), filters, and tests. Leave `team_member` until RAD-180. Seed `USR_ADM` / `USR_VWR` only via internal `setRoles` / ops.
4. **`getMe` floor:** Strip `getMe` to RAD-174 fields; keep privileged identity fields on `getById` only when `users.read` allows.
5. **Public role writes:** Ensure create/update APIs reject `roles`; keep internal `setRoles`. Confirm no role checkbox UI regresses (RAD-173).
6. **Users layout gate:** Add/extend `app/dashboard/users/layout.tsx` for per-route Actions (RAD-172); hide Users nav without `list`; no resource fetch until `can` is true.
7. **Unauthorized empty state:** Shared component with exact copy + `data-testid="unauthorized-empty"` on denied Users routes (RAD-171).
8. **Delete gate:** Authorize `deleteUser` (and UI Delete) via `can({ users, delete })`; reject Delete when subject holds `SYS_ADM`; keep not-self; retire `isSuperAdmin` on this path (RAD-175 + RAD-181).
9. **Users chrome:** Gate Create entry, Edit entry, Delete control, and Changes section by the matching Actions (including hide Changes without `changes.read`).
10. **Convex tests:** Extend `convex-test` / unit coverage for allow/deny per Role and Delete-of-`SYS_ADM`-subject (RAD-182 Acceptance list).
11. **E2E:** Add `tests/e2e/access-enforcement.spec.ts` for **Z–AG**; register in `playwright.config.ts` (authenticated project + Role `storageState` setup). Soft-skip when Role/target secrets are missing. Keep legacy `E2E_WORKOS_*` suites green.
12. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e` (bar for merge when secrets present for Z–AG).

## Acceptance criteria

- [ ] Product: nested catalog + `api.authz.can`; Users nav/routes/chrome gated; Unauthorized empty state on denied Users URLs; `getMe` floor; no client role assignment; Delete via `users.delete` with `SYS_ADM`-on-subject reject; Role codes `SYS_ADM` / `USR_ADM` / `USR_MGR` / `USR_VWR` with legacy migration
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test` (includes Convex deny cases from RAD-182)
- [ ] E2E: scenarios **Z–AG** in `tests/e2e/access-enforcement.spec.ts` when Role/target secrets are set (skip if unset); existing authenticated suites still pass with `E2E_WORKOS_*`; bar = `pnpm test:e2e`

## Open / deferred

- **Authz cache / revocation (soft default at pack):** No separate client authz cache or TTL in MVP 1. Rely on Convex reactive `can` / `getMe` subscriptions: Role changes apply on the next reactive update. Do **not** invent a 15-minute revocation bound in this build (architecture-doc bound stays out of scope).
- **Epic pointer hygiene:** After pack, point MVP 1 build children under [Roles and access (scoped RBAC)](https://linear.app/radi-dev/issue/RAD-152) — especially [MVP1: Seeded test principals per access persona](https://linear.app/radi-dev/issue/RAD-164) and [MVP1: E2E access gates (Users vs Profile)](https://linear.app/radi-dev/issue/RAD-165) — at this file. Rewrite story acceptance to match Z–AG + Role codes; do not re-grill.
- **Provision E2E principals:** Human fills `E2E_SYS_ADM_*`, `E2E_USR_ADM_*`, `E2E_USR_MGR_*`, `E2E_USR_VWR_*`, and `E2E_SYS_ADM_TARGET_*` (and seeds Roles). Until then Z–AG skip.
- **Migrate legacy E2E login** from `E2E_WORKOS_*` to `E2E_SYS_ADM_*` when ready — do not block this build on that retarget.
- **Profile-only Unauthorized-on-Users E2E** — later (not Z–AG).
- [RAD-180](https://linear.app/radi-dev/issue/RAD-180) `team_member` cleanup; [RAD-183](https://linear.app/radi-dev/issue/RAD-183) `SYS_SYS`.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-168/wayfinder-access-enforcement-handoff
- Children:
  - https://linear.app/radi-dev/issue/RAD-169/users-domain-action-catalog
  - https://linear.app/radi-dev/issue/RAD-170/can-query-contract-for-the-app-ui
  - https://linear.app/radi-dev/issue/RAD-171/unauthorized-empty-state-on-gated-users-routes
  - https://linear.app/radi-dev/issue/RAD-172/where-users-nav-and-route-gates-live
  - https://linear.app/radi-dev/issue/RAD-173/hide-role-assignment-ui-for-access-enforcement
  - https://linear.app/radi-dev/issue/RAD-174/profile-field-floor-api-shape
  - https://linear.app/radi-dev/issue/RAD-175/fold-delete-user-gate-into-usersdelete-action
  - https://linear.app/radi-dev/issue/RAD-176/authz-glossary-terms-for-access-enforcement
  - https://linear.app/radi-dev/issue/RAD-177/e2e-expectations-for-access-enforcement-build
  - https://linear.app/radi-dev/issue/RAD-179/foundational-role-codes-vs-ddd-rrr-migration
  - https://linear.app/radi-dev/issue/RAD-181/expand-access-enforcement-roles-system-admin-users-viewer
  - https://linear.app/radi-dev/issue/RAD-182/per-role-e2e-matrix-for-access-enforcement
- Related packed handoffs (do not delete): [`delete-user.md`](./delete-user.md), [`user-detail.md`](./user-detail.md), [`create-user.md`](./create-user.md), [`user-edit.md`](./user-edit.md), [`changes.md`](./changes.md)
- Glossary / ADR: [`GLOSSARY.md`](../../GLOSSARY.md), [`docs/adr/0003-role-code-ddd-rrr-naming.md`](../adr/0003-role-code-ddd-rrr-naming.md)
