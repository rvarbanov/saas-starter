# Authenticated dashboard shell

This packed file is the **App** frame handoff. The filename and map title stay (Linear); the product name is **App**, not “authenticated shell.” Language follows [`CONTEXT.md`](../../CONTEXT.md).

- **Map:** https://linear.app/radi-dev/issue/RAD-59/wayfinder-authenticated-dashboard-shell-handoff
- **Packed:** 2026-08-14
- **Re-packed:** 2026-08-24
- **Re-packed:** 2026-08-29 (RAD-82 Users list API slice)
- **Re-packed:** 2026-09-02 (RAD-83 Scenario J path set)
- **Status:** packed
- **Source children:** RAD-67, RAD-60, RAD-61, RAD-64, RAD-65, RAD-62, RAD-66, RAD-68, RAD-73, RAD-77, RAD-82, RAD-78, RAD-83

## Destination

A later build session implements the **App** frame (Global nav + Global header + Global footer + Content area) on `/dashboard/*`, the Users list backed by Convex `users.list` / `users.getById`, and the Demo page (KPIs / chart / table). When this handoff’s Acceptance criteria pass, the destination of the Wayfinder map is met for the build — this packed file is decision-complete; it does not implement UI.

**RAD-77 is a build slice**, not the map destination. See [Build slice: RAD-77](#build-slice-rad-77). Do not treat “implement this handoff” as “ship the Users list and Demo page” when the ticket is RAD-77.

**RAD-82 is a build slice** for Convex `users.list` / `users.getById` only. See [Build slice: RAD-82](#build-slice-rad-82). Do not treat that ticket as the Users page, Load more, or E2E **H**.

**RAD-78 is a build slice** for the Users page on top of RAD-82. See [Build slice: RAD-78](#build-slice-rad-78).

## Out of scope

- Admin section / a second Admin frame
- Multi-tenant workspaces / team UI
- Real billing or business metrics (the Demo page is illustrative mocks only)
- Mobile-first polish beyond “it works”
- Dark theme / theme switching
- Building or shipping the UI inside the Wayfinder map effort (plan-only; build is a later session)
- Full product E2E beyond App routes + public-site / Auth workflow frame regression (about, pricing, admin, etc.)

## Decisions

### shadcn component inventory for the App frame (RAD-67)

- Stack already locked: `base-nova` / Base UI via [`components.json`](../../components.json); today only `components/ui/button.tsx`.
- Add via CLI (not retired `shadcn-ui`):  
  `pnpm exec shadcn add sidebar card table chart separator avatar dropdown-menu breadcrumb sheet badge tooltip`
- Chart pulls `recharts@3.8.0`.
- Prefer `--dry-run` / `--diff` first; watch for overwrite of existing `button.tsx`. Do not re-init or switch away from the radix/base-nova preset.
- Soft later (only if the Demo page / table grows beyond this map): tabs / select / checkbox.

`sidebar` in the CLI command is the shadcn primitive for the App **Global nav**, not a product name.

### Users list authorization (RAD-60)

**Interim policy** (Users list reads for this App):

- **Who:** any principal with a valid WorkOS/JWT via `ctx.auth.getUserIdentity()` (Convex `users` row **not** required).
- **What:** Users list collection **and** by-id of other users over all `users` rows in the deployment.
- **Deny (no identity):** throw `"Not authenticated"`.
- **Enforce in:** Convex only (no extra UI/route role gate for the interim rule).
- **Writes / admin management:** out of scope; existing self-service APIs unchanged.
- **Field floor (Users list only):** never return `tokenIdentifier` or `workosUserId`. Positive columns owned by RAD-61. `getMe` may keep identity link fields for self.

**Debt (not blocking this build):** [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role) (RBAC / `user_role`); [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) (restrict Users list to Super admin or Manager).

### Users table columns and affordances (RAD-61)

- **Visible columns (L→R):** First name · Last name · Email · Created at · Updated at (`firstName`, `lastName`, `email`, `createdAt`, `updatedAt`).
- **Listed user:** `_id`, `firstName`, `lastName`, `email`, `createdAt`, `updatedAt` only. Never `name`, `appUserId`, `tokenIdentifier`, `workosUserId`.
- **Sort:** fixed `updatedAt` descending; headers non-interactive in v1.
- **~~Interim 50-row hard cap + truncation footer~~** — **superseded by RAD-64** (cursor pagination from day one). [RAD-71](https://linear.app/radi-dev/issue/RAD-71/users-list-cursor-pagination) canceled as absorbed.
- **UI (v1):** blank empty name cells; locale absolute datetimes in client TZ; plain-text email; ellipsis + `title` overflow; no row-click; no actions column; no current-user highlight; page title `Users`; empty `"No users yet"`; table skeleton loading; `"Couldn't load users"` + Retry on error; all five columns on narrow viewports (horizontal scroll OK).
- **Pagination UI:** Load more (append until `isDone`) — not the superseded 50-cap footer.
- **Search/filter:** shipped — [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter) (server-backed search + role/created filters; no Load more).

### Convex list-users API shape (RAD-64)

Implement later in `convex/users.ts` (alongside existing `getMe` / `store`).

- **Surface:** `api.users.list` (paginated Users list), `api.users.getById` (by-id Listed user read).
- **Shared:** `listUserValidator` / `toListUser`; keep `userDocValidator` for self-service (`getMe` may still expose identity link fields).
- **Auth:** same as RAD-60 — JWT via `ctx.auth.getUserIdentity()` only; deny → `"Not authenticated"`.
- **Listed user / returns item** (names optional to match schema): `_id`, `firstName?`, `lastName?`, `email`, `createdAt`, `updatedAt`. Never `tokenIdentifier`, `workosUserId`, `appUserId`, or `name`.
- **Index:** add `by_updatedAt` on `["updatedAt"]`. List: that index + `.order("desc").paginate(...)`.

**`users.list`**

| | |
| --- | --- |
| **Args** | `{ paginationOpts, search?, roles?, createdWithinDays? }` (RAD-72) |
| **Sort** | Fixed `updatedAt` desc (server-side) |
| **Returns** | `{ page, continueCursor, isDone }` (standard Convex pagination) |
| **Page size** | Silent clamp `numItems` ≤ **100**; UI default `initialNumItems: 25` |
| **UI** | **Load more** until `isDone` |

**`users.getById`**

| | |
| --- | --- |
| **Args** | `{ userId: Id<"users"> }` |
| **Returns** | Listed user or **`null`** if missing (not a throw) |

Renamed to `getById` on `main` in [#25](https://github.com/rvarbanov/saas-starter/pull/25) ([RAD-81](https://linear.app/radi-dev/issue/RAD-81/rename-apiusersget-to-apiusersgetbyid) absorbed).

### Convex Users list API land-and-push (RAD-82)

Ticket: [RAD-82](https://linear.app/radi-dev/issue/RAD-82/convex-implement-and-deploy-apiuserslist). Language: **Auth user** / **App user** / **Listed user** / **Users list** per [`CONTEXT.md`](../../CONTEXT.md).

- **Owns:** checklist item 7 — schema index `by_updatedAt`; `api.users.list` and `api.users.getById` in `convex/users.ts`; helpers; unit + `convex-test`. Land `list` and `getById` in the **same** PR. **Done on `main` (#25).**
- **Does not own:** Users page UI, Load more, Retry, E2E **H** (RAD-78 / checklist item 8).
- **Auth (RAD-60, unchanged):** Auth user JWT via `ctx.auth.getUserIdentity()` only. App user row not required. Deny → `"Not authenticated"`. Do not use `getCurrentUserOrThrow` for `list` / `getById`. An Auth user with no App user row is a provisioning race / failure — out of scope for this slice; do not add a third person-kind or change the deny path.
- **Source:** new branch + new PR from `main`. Reuse the API files from [PR 23](https://github.com/rvarbanov/saas-starter/pull/23) (`cursor/users-list-directory-6e91`); do not rewrite unless they drifted from RAD-64. Do not take the Users page from that PR. When RAD-82 is on `main`, PR 23 pulls it in to finish the page.
- **Push:** the build agent does **not** run Convex login / `CONVEX_DEPLOY_KEY`. After source + tests pass, the agent asks a human to run `npx convex dev` (or `pnpm convex:dev`) against `NEXT_PUBLIC_CONVEX_URL`. Do not use `npx convex deploy` unless this is an intentional production deploy.
- **Done bar (agent):** `pnpm typecheck`, `pnpm lint`, `pnpm test`. Then ping the human to push. Live `users:list` on the deployment and E2E **H** are not this slice’s merge gate.

### Route map for App pages (RAD-65)

**Closed path set:**

- `/dashboard`
- `/dashboard/settings`
- `/dashboard/profile`
- `/dashboard/users`
- `/dashboard/coming-soon`

- Nest under `/dashboard`; all `/dashboard/*` auth-gated.
- App layout: `app/dashboard/layout.tsx` with layout-only `withAuth({ ensureSignedIn: true })` (+ existing proxy).
- **No** redirects from old `/settings` or `/profile` — delete top-level `app/settings` and `app/profile`.
- Add `lib/app-routes.ts` for App path constants; keep `lib/auth-paths.ts` for AuthKit public paths.
- Update code, tests, and docs that still reference top-level settings/profile.

### Demo page content (RAD-62)

- Route: `/dashboard/coming-soon`. **Static mocks only** (no Convex).
- **Default module:** SaaS analytics. Also ship code-swap modules (no runtime switcher): shadcn classic, accounts receivable (AR), sport teams.
- Suggested modules: `lib/coming-soon/{types,saas-analytics,shadcn-classic,accounts-receivable,sport-teams,index}.ts`.
- Page title: **Coming soon**. Subtitle: `Illustrative demo metrics — not connected to live data.`
- Layout: four KPI cards → single-series area chart → table.
- Chart ranges: Last 3 months (**default**) / 30d / 7d. KPI anatomy matches shadcn dashboard reference (no sparklines).
- Table: 24 rows, 8 per page; five slots — name · category · status (badge) · metric · owner; no drag / bulk / customize-columns.
- Build invents concrete mock arrays from this locked schema (do not invent alternate layouts).

### Global nav IA and App frame (RAD-66)

- On `/dashboard/*`, **replace** the public-site Global nav and Global footer (`GlobalNav` / `GlobalFooter` components).
- App Global header: breadcrumbs + Avatar menu (+ Global nav trigger as needed). Landmarks: `data-testid="app-sidebar"`, `data-testid="app-topbar"`.
- Public-site frame via `app/(public)/` route group (**include Auth workflow pages** so they keep the public-site frame). App frame stays under `app/dashboard/layout.tsx`.
- Global nav (flat, icon + label), order:
  1. Dashboard → `/dashboard`
  2. Users → `/dashboard/users`
  3. Coming soon → `/dashboard/coming-soon`
- Brand label: **SaaS Starter Kit** → `/dashboard`.
- Active state: exact match on Dashboard; prefix match elsewhere.
- Desktop Global nav collapsible; **default expanded**. Mobile: Sheet.
- Avatar menu (avatar-only trigger **in the Global header**): Profile → Settings → separator → Sign out. Profile and Settings are **menu-only** (not Global nav links).
- Breadcrumbs: `Dashboard` + leaf.
- Strip page-body duplicates of frame actions (e.g. redundant sign-out / nav) in the later build.
- Exact Lucide icons: **locked by RAD-77** (was a pack soft default).

### App Global header and Global nav leftovers (RAD-77)

Language follows [`CONTEXT.md`](../../CONTEXT.md). The signed-in product is the **App**. Its frame is the app **Global header** + **Global nav** (sidebar-shaped) + **Global footer** + **Content area**. Do not use “authenticated shell,” “public chrome,” or “top bar” as product names. Landmarks `data-testid="app-sidebar"` (Global nav root) and `data-testid="app-topbar"` (Global header) stay as implementation testids.

RAD-66 IA stays locked. Packed IA wins over [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) (no Work / Team / Admin rows).

**Already on `main` (not this slice):** `app/(public)/` public-site frame; `/dashboard/settings` and `/dashboard/profile`; [`lib/app-routes.ts`](../../lib/app-routes.ts).

**Inset and collapse**

- Inset: Global nav flush left; Content area in a rounded inset panel.
- Desktop Global nav `collapsible="icon"` (narrow icon rail when collapsed). **Default expanded.** Collapse persisted in a cookie (shadcn `SidebarProvider` default). Keyboard **⌘B / Ctrl+B**.
- Mobile: Sheet (RAD-66). Collapse / Sheet stay out of map Acceptance E2E.

**App Global header**

- Lives **inside** the inset (not full-bleed above the Global nav).
- Left: Global nav trigger + breadcrumbs. Right: Avatar menu. Trigger visible on desktop and mobile.
- Sticky within the inset.

**Breadcrumbs**

- `/dashboard` → single crumb **Dashboard** (not a link).
- Nested → Dashboard (link to `/dashboard`) + leaf (not a link).
- Leaves: **Settings**, **Profile**, **Users**, **Coming soon**. No Home crumb. Do not use page H1s as crumbs.

**Icons and brand**

- Dashboard → `LayoutDashboard`
- Users → `Users`
- Coming soon → `Sparkles`
- Brand: text **SaaS Starter Kit** only (no logo asset) → `/dashboard`.

**Avatar menu**

- **One trigger only**, on the right of the app Global header. Not in the Global nav.
- Avatar-only trigger. **Initials**, no photo.
- Initials from Convex first + last, else `name`, else email local-part, else `?`.
- Open panel: **name + email** above the actions (omit name if missing). Then Profile → Settings → separator → Sign out. No extra rows.
- **Sign out** reuses today’s Convex-close + `GET /sign-out` behavior (extract from `SignOutButton` if needed). Remove the page-body Sign out control.

**Global nav contains (and only this)**

- Brand: **SaaS Starter Kit** → `/dashboard`
- Dashboard → `/dashboard`
- Users → `/dashboard/users`
- Coming soon → `/dashboard/coming-soon`
- Collapse rail / mobile Sheet as already locked

**Global nav does not contain:** Avatar menu, user card, Profile, Settings, or Sign out. Do not add a shadcn `SidebarFooter` account block. The app **Global footer** (copyright + GitHub) is a different thing — it sits under the Content area, not in the nav.

**Stubs (until Users list / Demo page tickets replace the bodies)**

| Route | Heading | Body line |
| --- | --- | --- |
| `/dashboard/users` | `Users` | `User directory is not wired up yet.` |
| `/dashboard/coming-soon` | `Coming soon` | `Demo metrics land in a later ticket.` |

- Do **not** use the RAD-62 Demo page subtitle or KPI / chart / table on the stub.
- Landmark is the heading. No extra stub testids.
- Preserve existing dashboard / settings / profile **body copy** in the Content area (pack soft default). Strip redundant in-body nav / Sign out (RAD-66).

**App Global footer**

- The app has a **Global footer** (glossary: same term as the public site’s bottom bar).
- Lives **inside** the inset, below the Content area.
- **Same words** as today’s public-site footer: `Copyright © {year}` · `Created by rvarbanov` (GitHub, `GITHUB_REPO_URL`). No extra nav.
- Do **not** mount `components/global-footer.tsx` on App routes. New app footer markup.
- E2E E still means the **public-site** Global footer is absent on `/dashboard/*`, not that copyright text is forbidden.

**shadcn for this slice only:**  
`pnpm exec shadcn add sidebar separator avatar dropdown-menu breadcrumb sheet tooltip`  
(dry-run first; protect `button.tsx`). Do **not** add `card` / `table` / `chart` / `badge` in RAD-77 — those wait for the Users list and Demo page.

### Handoff spec format and home (RAD-68)

- Canonical packed handoff lives under `docs/handoffs/` (this file). Format/home locked in [`CONTRACT.md`](./CONTRACT.md).
- Linear posts **pointer** resolution comments only (path + destination met + packed child IDs) — not a second full copy.
- Authority: after pack, **this file wins** over Linear summaries. Post-pack choice changes require re-grill + re-pack.

### E2E expectations for the App frame build (RAD-73)

**Format:** named scenario checklist — route(s) + user action + primary assertion landmarks. No full Playwright source in this handoff.

**Landmarks:** hybrid — accessible names for public-site / Auth workflow frame and IA labels; locked `data-testid`s for new App frame interactives.

**testid contract (build must add):**

| testid | Purpose |
|--------|---------|
| `app-sidebar` | App Global nav root |
| `app-topbar` | App Global header |
| `users-directory-table` | Users list table |
| `users-load-more` | Load more control (UI ok; **not** required in E2E this map) |
| `coming-soon-chart` | Demo page chart region |
| `coming-soon-table` | Demo page table |
| `coming-soon-table-next` | Demo page table paging next |

Nav labels, range buttons (`3m` / `30d` / `7d`), Avatar menu items, and existing `convex-user-profile` / `convex-status` stay accessible-name / existing testids.

**Closed Acceptance scenarios:**

| ID | Scenario |
|----|----------|
| A/B | Keep today’s public-site / Auth workflow assertion floor (home + public-site Global nav on `/` and `/sign-in`; sign-in/sign-up Auth workflow). Update if `(public)` move breaks them. |
| C | Unauthenticated cannot stay on all five: `/dashboard`, `/dashboard/users`, `/dashboard/coming-soon`, `/dashboard/settings`, `/dashboard/profile`. Retire top-level `/settings` and `/profile` unauth tests when those routes are deleted. |
| D | Real WorkOS setup login + authenticated proof of gated App access (dashboard + App subpages). |
| E | On `/dashboard`: `app-sidebar` + `app-topbar` visible; **public-site** Global nav + Global footer absent. |
| F | Full Global nav tour: Dashboard → Users → Coming soon → Dashboard (URL + page landmark each hop). |
| G | Avatar menu → Settings and Profile (URLs + landmarks); Settings/Profile are **not** Global nav links. |
| H | Users list: `users-directory-table` visible; column headers First/Last/Email/Created at/Updated at; ≥1 data row. **Load more interaction not in E2E.** |
| I | Demo page: title + subtitle; `coming-soon-chart` + `coming-soon-table`; toggle range to **30d**; one click `coming-soon-table-next`. |
| J | Update-in-place existing authenticated coverage: Convex profile; session across **all five** App paths + home (`/dashboard` → `/dashboard/settings` → `/dashboard/profile` → `/dashboard/users` → `/dashboard/coming-soon` → `/`; URL + one landmark per hop); authenticated `/sign-up` → `/dashboard`; sign-out **via Avatar menu**. Scenario **D** stays distributed (setup login + authenticated proofs; no separate labeled D test). |

**Organization & bar:**

- Update `tests/e2e/auth.spec.ts` / `auth-authenticated.spec.ts` / `auth-sign-out.spec.ts` for new paths/frame.
- Add `tests/e2e/shell.spec.ts` on the **authenticated** project for E–I.
- Acceptance E2E command: `pnpm test:e2e` / `make e2e` only (not `e2e-prod`).
- Desktop Chrome / Chromium only.

**Secrets (mandatory):** every environment that runs E2E — including local — must have `E2E_WORKOS_EMAIL` and `E2E_WORKOS_PASSWORD` (plus existing WorkOS cookie/API secrets per AGENTS.md). If missing, E2E **fails** (no omitting/skipping authenticated projects). Build updates Playwright config/setup to enforce this.

## Build slice: RAD-77

Ticket: [RAD-77](https://linear.app/radi-dev/issue/RAD-77/ui-authenticated-sidebar-and-top-bar) — App Global header + Global nav + Global footer + Content area.

**Do**

1. Add slice shadcn set: `pnpm exec shadcn add sidebar separator avatar dropdown-menu breadcrumb sheet tooltip` (dry-run first; protect `button.tsx`).
2. Add `app/dashboard/layout.tsx` with the App frame (inset Global nav + in-inset Global header + Content area + in-inset Global footer) and layout-only `withAuth({ ensureSignedIn: true })`.
3. Wire Global nav IA + Avatar menu + breadcrumbs per RAD-66 + RAD-77; brand **SaaS Starter Kit**; landmarks `app-sidebar` / `app-topbar`.
4. Add the app Global footer inside the inset (copyright + GitHub credit; do not mount `components/global-footer.tsx`).
5. Add stub pages `app/dashboard/users/page.tsx` and `app/dashboard/coming-soon/page.tsx` per the RAD-77 stub table.
6. Strip page-body Sign out and redundant in-body nav on dashboard / settings / profile. Leave those pages’ existing body copy.
7. Update E2E that this slice actually touches: sign-out via Avatar menu (J); App Global nav + Global header visible and public-site frame absent on `/dashboard/*` (E); Global nav tour over stubs (F); Avatar menu → Settings / Profile (G); unauthenticated cannot stay on the five App paths including stubs (C). Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

**Do not (in RAD-77)**

- Convex `users.list` / `users.getById`, Users list table, Demo page modules / chart / table
- Map E2E **H** and **I**
- Re-do `app/(public)/`, nest settings/profile, or add `lib/app-routes.ts` (already on `main`)
- Add Work / Team / Admin to the Global nav

Map-level checklist and Acceptance below stay the **full destination**.

## Build slice: RAD-82

Ticket: [RAD-82](https://linear.app/radi-dev/issue/RAD-82/convex-implement-and-deploy-apiuserslist) — Convex `users.list` + `users.getById`.

**Do**

1. New branch from `main`; new PR (do not continue [PR 23](https://github.com/rvarbanov/saas-starter/pull/23)).
2. Add `by_updatedAt` on `users` in `convex/schema.ts`.
3. Implement `api.users.list` and `api.users.getById` in `convex/users.ts` alongside `getMe` / `store`, per RAD-64 + RAD-60. Reuse PR 23 API files if they still match; do not rewrite for style.
4. Helpers: `requireIdentity` / `identityOrThrow`; `toListUser` / `listUserValidator`; `clampPaginationNumItems` (cap 100, do not throw).
5. Tests that do not need a live Convex push: `lib/*.spec.ts` (mapper omits Auth user identity fields; deny message; clamp) and `convex-test` in `convex/users.test.ts` (unauthenticated `list` / `getById` throw `"Not authenticated"`; `getById` missing id → `null`; `list` sort `updatedAt` desc; Listed user shape; `numItems: 200` returns at most 100). Pin `convex-test@0.0.54` while the app is on `convex@^1.34`.
6. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`.
7. Ask a human to run `npx convex dev` / `pnpm convex:dev` against `NEXT_PUBLIC_CONVEX_URL`.

**Do not (in RAD-82)**

- Users page, Load more, Retry, toast, search/filter
- E2E **H** (`users-directory-table`)
- Rename `users.get` → `users.getById` (RAD-81) — **done in #25**
- RBAC (RAD-69 / RAD-70)
- `npx convex deploy` unless this is an intentional production deploy
- Demo page (RAD-79)

## Build slice: RAD-78

Ticket: [RAD-78](https://linear.app/radi-dev/issue/RAD-78/users-directory-api-and-dashboardusers-page) — Users list API + Users page.

**Do**

1. ~~Schema `by_updatedAt` + `api.users.list` / `api.users.getById`~~ **Done on `main`** ([RAD-82](https://linear.app/radi-dev/issue/RAD-82/convex-implement-and-deploy-apiuserslist) / [#25](https://github.com/rvarbanov/saas-starter/pull/25)).
2. Auth: JWT via `ctx.auth.getUserIdentity()` only. Caller does **not** need a Convex `users` row. Deny → `"Not authenticated"`. RBAC out of scope. (Enforced in Convex on `main`.)
3. Listed user fields only: `_id`, `firstName?`, `lastName?`, `email`, `createdAt`, `updatedAt`. Keep `userDocValidator` for `getMe`.
4. `users.list`: args `{ paginationOpts }` only; `updatedAt` desc; silent clamp `numItems` ≤ 100; returns `{ page, continueCursor, isDone }`.
5. `users.getById`: args `{ userId }`; Listed user or `null` if missing. (Packed name was `get`; rename shipped in RAD-82.)
6. Users page: one `useQuery` with `{ paginationOpts: { numItems: 25, cursor: null } }`. No Load more, no `users-load-more`.
7. Table columns L→R: First name · Last name · Email · Created at · Updated at. Empty `"No users found"`. Error: inline server message, or `"Something went wrong"` if none. No Retry, no toast. Landmark `users-directory-table`. Dates: `dateStyle: "medium"`, `timeStyle: "short"`.
8. Vitest: mapper / auth deny / clamp plus `convex-test` for `list` / `getById` — **on `main`**. This slice: Users page tests + E2E **H**. Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

**Do not (in RAD-78)**

- Load more, Retry, toast, search/filter, RBAC
- Re-implement Convex `users.list` / `users.getById` (RAD-82)
- Demo page (RAD-79)

## Build checklist

1. Add shadcn components: `pnpm exec shadcn add sidebar card table chart separator avatar dropdown-menu breadcrumb sheet badge tooltip` (dry-run first; protect `button.tsx`). RAD-77 adds the frame subset first; Users list / Demo page add the rest.
2. ~~Move public-site / Auth workflow routes under `app/(public)/`~~ **Done on `main`.**
3. Add `app/dashboard/layout.tsx` with the App frame (Global nav + Global header + Global footer + Content area) and layout-only `withAuth({ ensureSignedIn: true })`.
4. Nested `/dashboard/settings` and `/dashboard/profile` **done on `main`**. Still create `app/dashboard/users/page.tsx` and `app/dashboard/coming-soon/page.tsx` (stubs in RAD-77; full bodies later).
5. ~~Delete top-level `app/settings/` and `app/profile/`~~ **Done on `main`** — **no** legacy redirects.
6. ~~Add `lib/app-routes.ts`~~ **Done on `main`.** Keep `lib/auth-paths.ts` aligned with AuthKit public paths / proxy.
7. ~~Schema + Convex: add `by_updatedAt` on `users`; implement `api.users.list` and `api.users.getById` in `convex/users.ts` per RAD-64 (Listed user + auth from RAD-60/61).~~ **Done on `main` (RAD-82, #25).**
8. ~~Build Users page: first 25 rows via `useQuery` and `users-directory-table`; no Load more.~~ **Done on `main` (RAD-78, #23).**
9. Add `lib/coming-soon/` modules (default SaaS analytics + three code-swap modules); wire Demo page (KPI → chart → table) with testids and range/paging controls per RAD-62 / RAD-73.
10. Wire Global nav IA + Avatar menu + breadcrumbs per RAD-66; brand **SaaS Starter Kit**; strip duplicate frame actions from page bodies.
11. Preserve existing dashboard/settings/profile **body copy** inside the Content area (soft default).
12. ~~E2E: update auth specs for new paths/frame; add `tests/e2e/shell.spec.ts` covering scenarios E–I; cover A–D and J as specified; enforce E2E WorkOS secrets fail-fast.~~ **Done on `main` (RAD-77/78/79 + RAD-80 audit).**
13. Run quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e` / `make e2e`.

## Acceptance criteria

### RAD-77 slice

- [ ] **Product:** App frame on `/dashboard/*` (Global nav + Global header + Global footer + Content area; no public-site Global header / Global nav / Global footer). Settings and Profile via Avatar menu only. Users and Coming soon are stubs per RAD-77. Page-body Sign out gone.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] **E2E:** Scenarios **C, E, F, G, J** from RAD-73 (stubs satisfy F’s page landmarks). Not H or I.

### RAD-82 slice

- [x] **Product:** `api.users.list` (paginated Users list of App users as Listed users) and `api.users.getById` (by-id Listed user or `null`) exist in repo source per RAD-64 / RAD-60. No Users page changes. **Done on `main` (#25).**
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test` (unit + `convex-test`; no live Convex push required)
- [ ] **E2E:** none for this slice (no page touched). Scenario **H** stays RAD-78.
- [ ] After merge-ready source: ask a human to `npx convex dev` / `pnpm convex:dev` against `NEXT_PUBLIC_CONVEX_URL`.

### Map destination (full App frame)

- [x] **Product:** Closed route set live under `/dashboard/*` with the App frame (no public-site frame on App routes); Users list matches RAD-60/61/64; Demo page matches RAD-62; Profile/Settings via Avatar menu only. **Shipped on `main` (RAD-77 / RAD-78 / RAD-79).**
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] **E2E:** Scenarios **A–J** from RAD-73 covered in repo (`tests/e2e/shell.spec.ts` E–I; auth specs A–D/J); required testids present; secrets mandatory (fail if missing). **Acceptance bar: `pnpm test:e2e` / `make e2e`.** Scenario J session walk is all **five** App routes + home (RAD-83).

## Open / deferred

- **Page copy (pack soft default):** preserve existing dashboard/settings/profile body copy inside the Content area; do not invent rewrites unless a later grill says otherwise.
- **Lucide icons:** locked in RAD-77 (`LayoutDashboard` / `Users` / `Sparkles`).
- **Demo page mock values:** build invents concrete arrays from the locked schema (RAD-62); do not invent alternate layouts or a runtime module switcher.
- **RBAC:** [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role), [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) — outside this handoff.
- **Users search/filter:** [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter) — **shipped** (this build). E2E **H2** needs the live Convex deployment to include this PR’s `users.list` args (human `pnpm convex:dev` / CI `CONVEX_DEPLOY_KEY` + `pnpm convex:backfill-search-text`); until then H2 soft-skips when the deployment rejects `search`.
- **RAD-71** canceled (cursor pagination absorbed into RAD-64).
- **E2E deferred (do not invent for Acceptance):** Users Load more interaction; mobile Sheet / collapse; desktop Global nav collapse affordance; Demo page module-switching; `make e2e-prod` as Acceptance.
- **Session path grill:** [RAD-83](https://linear.app/radi-dev/issue/RAD-83/grill-fill-app-session-e2e-path-gaps-post-rad-80) — **resolved:** Scenario J walks all five App routes + home (URL + one landmark per hop); D stays distributed.
- **RAD-82 live push:** human runs `convex dev` when the agent asks; not a merge gate for the RAD-82 PR.
- **RAD-81:** rename `api.users.get` → `api.users.getById` — **done in #25**.
- **Auth user with no App user row:** provisioning race / failure; out of scope (no extra person-kind, no extra deny path).
- **Users list Load more UI:** API stays paginated (RAD-64); RAD-78 UI loads the first 25 rows only. Load more is later work.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-59/wayfinder-authenticated-dashboard-shell-handoff
- Children:
  - https://linear.app/radi-dev/issue/RAD-67/shadcn-component-inventory-for-shell
  - https://linear.app/radi-dev/issue/RAD-60/users-list-authorization
  - https://linear.app/radi-dev/issue/RAD-61/users-table-columns-and-affordances
  - https://linear.app/radi-dev/issue/RAD-64/convex-list-users-api-shape
  - https://linear.app/radi-dev/issue/RAD-65/route-map-for-shell-pages
  - https://linear.app/radi-dev/issue/RAD-62/coming-soon-demo-content
  - https://linear.app/radi-dev/issue/RAD-66/sidebar-ia-and-chrome
  - https://linear.app/radi-dev/issue/RAD-68/handoff-spec-format-and-home
  - https://linear.app/radi-dev/issue/RAD-73/e2e-expectations-for-shell-build
  - https://linear.app/radi-dev/issue/RAD-77/ui-authenticated-sidebar-and-top-bar
  - https://linear.app/radi-dev/issue/RAD-82/convex-implement-and-deploy-apiuserslist
  - https://linear.app/radi-dev/issue/RAD-78/users-directory-api-and-dashboardusers-page
  - https://linear.app/radi-dev/issue/RAD-83/grill-fill-app-session-e2e-path-gaps-post-rad-80
- Format contract: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
- Glossary: [`CONTEXT.md`](../../CONTEXT.md)
