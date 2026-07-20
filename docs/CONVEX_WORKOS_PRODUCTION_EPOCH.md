# Epoch seed: Convex + WorkOS production readiness

**Purpose:** Snapshot of the current Convex and WorkOS implementation, what is done, and what remains before treating the integration as **production-ready**. Use this document to open an **epoch** (parent initiative) and **sub-issues** (concrete tickets).

**Source:** Code review of the repo (AuthKit, `convex/`, env split). Update this file when scope changes.

---

## Executive summary


| Layer                | MVP status                                                         | Production bar                                                                                             |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **WorkOS (Next.js)** | Sign-in, callback, session, `/dashboard` protected                 | Live dashboard config, secrets per environment, stable cookie password                                     |
| **Convex**           | URL guard, JWT `auth.config.ts`, token bridge, public `ping` query | `WORKOS_CLIENT_ID` on Convex deployment, prod deployment + URL, schema + **server-side auth** on real APIs |


---

## WorkOS AuthKit — completed (MVP wiring)


| Area             | Location / notes                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Provider shell   | `AuthKitProvider` in `app/layout.tsx`                                                           |
| Request boundary | `proxy.ts` — `authkitProxy`, `unauthenticatedPaths`: `/`, `/callback`, `/sign-in`               |
| OAuth callback   | `app/callback/route.ts` — `handleAuth({ returnPathname: "/dashboard" })`                        |
| Sign-in entry    | `app/sign-in/route.ts` — `getSignInUrl()` + redirect                                            |
| Protected route  | `app/dashboard/page.tsx` — `withAuth({ ensureSignedIn: true })`                                 |
| Public home      | `app/page.tsx` — `withAuth()`, links to `/sign-in` or `/dashboard`                              |
| Env split        | `.env`: client id, redirect, public URLs; `.secret`: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD` |


**Outcome:** Users can complete AuthKit sign-in and reach `/dashboard` at the Next.js layer.

---

## Convex — completed (connectivity + token bridge)


| Area                          | Location / notes                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| JWT validation config         | `convex/auth.config.ts` — WorkOS `customJwt` providers (requires `WORKOS_CLIENT_ID` on Convex)    |
| React integration             | `components/convex-auth-provider.tsx` — `ConvexProviderWithAuth` + `getAccessToken()` from WorkOS |
| Safe client boot              | `lib/convex-config.ts` — only construct client for real `https://*.convex.cloud` URLs             |
| Smoke API                     | `convex/ping.ts` — `getMessage` (public, no auth)                                                 |
| Schema                        | `convex/schema.ts` — **`users`** table + `by_token`, `by_email`, `by_app_user_id` indexes        |
| Server-side auth in functions | `convex/users.ts` — `store`, `getMe`; `convex/usersActions.ts` — `updateEmail` (backend only)     |
| Client provisioning           | `components/use-store-user.ts` + `ConvexUserSync` — upsert on sign-in                             |


**Outcome:** Convex runs, the UI can call a public query, and access tokens are passed for authenticated functions. **Users auto-provision on sign-in** via `users.store` (linked by `tokenIdentifier`). `user_role` / RBAC deferred.

### Users table — link fields (v1)

| Field | Role |
| ----- | ---- |
| `tokenIdentifier` | **Auth link** — JWT → user row (`by_token` index) |
| `workosUserId` | WorkOS `identity.subject` — User Management API calls |
| `_id` (`Id<"users">`) | Convex FK target for app tables |
| `appUserId` | UUID v4 portable id for external APIs / migration export |

**Verify (local):** sign in → Convex Data tab shows one `users` row; `make ci` green; with E2E creds, `make e2e` asserts `convex-user-profile` on dashboard/settings.

**Email updates (backend only):** `usersActions.updateEmail` → WorkOS API → `patchEmailInternal`. Requires `WORKOS_API_KEY` on Convex deployment. Passive sync on re-login via `store`. Settings email UI deferred.

### Users directory authorization (RAD-60)

**Decision:** [RAD-60](https://linear.app/radi-dev/issue/RAD-60/users-list-authorization).

**Interim policy** (unblocks RAD-61 → RAD-64 / authenticated shell Users handoff):

- **Who:** any principal with a valid WorkOS/JWT via `ctx.auth.getUserIdentity()` (Convex `users` row not required).
- **What:** directory reads — collection list **and** by-id of other users — over all `users` rows in the deployment.
- **Deny (no identity):** throw `"Not authenticated"`.
- **Enforce in:** Convex only (no extra UI/route role gate for the interim rule).
- **Writes / admin management:** out of scope; existing self-service APIs unchanged.
- **Field floor (directory only):** responses must **never** include `tokenIdentifier` or `workosUserId`. Positive columns are owned by RAD-61 (resolved below). `getMe` may keep those fields for self.

**Tracked debt** (soft warning — does **not** formally block shipping the Users list or RAD-61/64):

1. [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role) — Implement RBAC / `user_role` (outside RAD-59; same project).
2. [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) — Restrict directory read to Super admin **or** Manager; Team member → throw `"Unauthorized"`; Manager’s exact row filter deferred until teams/RBAC. Blocked by RAD-69. Neither blocks RAD-61/64.

### Users table columns and affordances (RAD-61)

**Decision:** [RAD-61](https://linear.app/radi-dev/issue/RAD-61/users-table-columns-and-affordances).

**Visible columns** (L→R): First name · Last name · Email · Created at · Updated at (`firstName`, `lastName`, `email`, `createdAt`, `updatedAt`).

**Directory DTO** (list + by-id of others): `_id`, `firstName`, `lastName`, `email`, `createdAt`, `updatedAt` only. (`_id` is row identity — not a visible column.)

**Sort & load:**

- Fixed sort: `updatedAt` descending (headers not interactive in v1).
- ~~Interim hard cap: **50** rows; truncation footer when capped.~~ **Superseded by [RAD-64](https://linear.app/radi-dev/issue/RAD-64/convex-list-users-api-shape):** cursor pagination from day one (see below). [RAD-71](https://linear.app/radi-dev/issue/RAD-71/users-list-cursor-pagination) canceled as absorbed.
- Search/filter deferred — [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter).

**UI affordances (v1):** blank empty name cells; locale absolute datetimes in client local TZ; plain-text email; ellipsis + `title` overflow; no row-click; no actions column; no current-user highlight; page title `Users`; empty “No users yet”; table skeleton loading; “Couldn’t load users” + Retry on error; all five columns on narrow viewports (horizontal scroll OK). **Pagination chrome:** Load more (append pages until `isDone`) — not the superseded 50-cap truncation footer.

### Convex list-users API shape (RAD-64)

**Decision:** [RAD-64](https://linear.app/radi-dev/issue/RAD-64/convex-list-users-api-shape).

**Module:** `convex/users.ts` — `api.users.list`, `api.users.get` (alongside `getMe` / `store`). Shared directory validator/mapper; keep `userDocValidator` for self-service (`getMe` may still expose identity link fields).

**Auth (from RAD-60):** JWT via `ctx.auth.getUserIdentity()` only — caller Convex `users` row **not** required. Deny → throw `"Not authenticated"`.

**Directory DTO / returns item** (names optional to match schema):

`_id`, `firstName?`, `lastName?`, `email`, `createdAt`, `updatedAt` — never `tokenIdentifier`, `workosUserId`, `appUserId`, or `name`.

**Index:** add `by_updatedAt` on `["updatedAt"]`. List uses that index + `.order("desc").paginate(...)`.

**`users.list`:**

- **Args:** `{ paginationOpts }` only (no sort/search/filter args; sort hardcoded).
- **Returns:** `{ page: DirectoryUser[], continueCursor: string, isDone: boolean }` (standard Convex pagination).
- **Page size:** client `numItems`; server **silent clamp** to max **100**. UI default `initialNumItems: 25`; Load more until `isDone`.

**`users.get`:**

- **Args:** `{ userId: Id<"users"> }`.
- **Returns:** directory row or `null` if missing (not a throw).

**Tracked debt:** [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter) — search/filter (extends list args later). Implementation of this contract is a later build; this section is the grilled query contract only.

---

## Production readiness — gaps (issue seeds)

Use the subsections below as **epic children** or **epoch checklist items**.

### A. WorkOS — environment and dashboard

- Register **production** redirect URI(s) in WorkOS (e.g. `https://<prod-domain>/callback`); align with `NEXT_PUBLIC_WORKOS_REDIRECT_URI` per environment.
- Use consistent **test vs live** WorkOS keys with each environment.
- Configure **Vercel** (or host) secrets: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_CLIENT_ID`, and public URL / redirect vars as required by AuthKit.
- Document **cookie password** policy: generate once per env (`openssl rand -base64 32`), keep stable; rotation invalidates sessions.
- (Product) Roles, orgs, admin — **out of MVP** in code today; track separately if in scope.

### B. Convex — deployment and configuration

- Set `**WORKOS_CLIENT_ID`** on the **Convex** deployment: `npx convex env set WORKOS_CLIENT_ID …` (required for JWT validation in `auth.config.ts`).
- **Production** Convex project + `**NEXT_PUBLIC_CONVEX_URL`** for production builds (separate from dev if desired).
- **Deploy path:** `pnpm convex deploy` and/or CI with `**CONVEX_DEPLOY_KEY`** so prod always matches `convex/` in git.

### C. Convex — application security and data

- ~~Define `**schema.ts`** (tables, indexes) for real features.~~ **Done (v1):** `users` table + indexes.
- ~~Implement queries/mutations that use `**ctx.auth.getUserIdentity()`**~~ **Done (v1):** `users.store`, `users.getMe`, `usersActions.updateEmail`.
- **Never** accept client-supplied `userId` for authorization; derive identity only server-side in Convex.
- Add integration tests or manual test plan: signed-in user sees correct data; signed-out or wrong token cannot mutate others’ data.
- **Deferred:** `user_role` table ([RAD-69](https://linear.app/radi-dev/issue/RAD-69); directory tighten [RAD-70](https://linear.app/radi-dev/issue/RAD-70)), Settings email change UI, admin invite flow.

### D. Cross-cutting “definition of done”

- End-to-end verification on **production URL** with **live** WorkOS + **prod** Convex deployment.
- Every Convex function that touches **user-owned data** validates `**getUserIdentity()`** (or explicit public read policy documented).

---

## Suggested epoch / sub-issue titles (copy into tracker)

**Epoch (parent):** `Convex + WorkOS production hardening`

**Sub-issues (examples):**

1. WorkOS: production redirect URIs and environment matrix (dev / preview / prod)
2. WorkOS: Vercel (host) secrets and `NEXT_PUBLIC_`* alignment
3. Convex: set `WORKOS_CLIENT_ID` on dev + prod Convex deployments
4. Convex: prod deployment + `NEXT_PUBLIC_CONVEX_URL` + deploy/CI key
5. Convex: initial schema + first authenticated mutation/query with `getUserIdentity()`
6. Convex: security review — no client-trusted user ids; arg validation on public APIs
7. E2E or manual runbook: sign-in → dashboard → authenticated Convex path on prod-like stack

---

## Related docs

- `README.md` — env file split (`.env` / `.secret`)
- `docs/IMPLEMENTATION.md` §2.2 — Convex env, `pnpm convex:dev`, WorkOS on Convex
- `docs/SPECIFICATION.md` — broader product scope (roles, routes) beyond this integration