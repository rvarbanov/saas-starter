# Authenticated dashboard shell

This packed file is the **App** frame handoff. The filename and map title stay (Linear); the product name is **App**, not “authenticated shell.” Language follows [`CONTEXT.md`](../../CONTEXT.md).

- **Map:** https://linear.app/radi-dev/issue/RAD-59/wayfinder-authenticated-dashboard-shell-handoff
- **Packed:** 2026-08-14
- **Re-packed:** 2026-08-24
- **Status:** packed
- **Source children:** RAD-67, RAD-60, RAD-61, RAD-64, RAD-65, RAD-62, RAD-66, RAD-68, RAD-73, RAD-77

## Destination

A later build session implements the **App** frame (Global nav + Global header + Global footer + Content area) on `/dashboard/*`, the Users list backed by Convex `users.list` / `users.getById`, and the Demo page (KPIs / chart / table). When this handoff’s Acceptance criteria pass, the destination of the Wayfinder map is met for the build — this packed file is decision-complete; it does not implement UI.

**RAD-77 is a build slice**, not the map destination. See [Build slice: RAD-77](#build-slice-rad-77). Do not treat “implement this handoff” as “ship the Users list and Demo page” when the ticket is RAD-77.

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
- **Search/filter:** deferred — [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter).

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
| **Args** | `{ paginationOpts }` only (no sort/search/filter) |
| **Sort** | Fixed `updatedAt` desc (server-side) |
| **Returns** | `{ page, continueCursor, isDone }` (standard Convex pagination) |
| **Page size** | Silent clamp `numItems` ≤ **100**; UI default `initialNumItems: 25` |
| **UI** | **Load more** until `isDone` |

**`users.getById`**

| | |
| --- | --- |
| **Args** | `{ userId: Id<"users"> }` |
| **Returns** | Listed user or **`null`** if missing (not a throw) |

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
| J | Update-in-place existing authenticated coverage: Convex profile; session across App paths + home; authenticated `/sign-up` → `/dashboard`; sign-out **via Avatar menu**. |

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

## Build checklist

1. Add shadcn components: `pnpm exec shadcn add sidebar card table chart separator avatar dropdown-menu breadcrumb sheet badge tooltip` (dry-run first; protect `button.tsx`). RAD-77 adds the frame subset first; Users list / Demo page add the rest.
2. ~~Move public-site / Auth workflow routes under `app/(public)/`~~ **Done on `main`.**
3. Add `app/dashboard/layout.tsx` with the App frame (Global nav + Global header + Global footer + Content area) and layout-only `withAuth({ ensureSignedIn: true })`.
4. Nested `/dashboard/settings` and `/dashboard/profile` **done on `main`**. Still create `app/dashboard/users/page.tsx` and `app/dashboard/coming-soon/page.tsx` (stubs in RAD-77; full bodies later).
5. ~~Delete top-level `app/settings/` and `app/profile/`~~ **Done on `main`** — **no** legacy redirects.
6. ~~Add `lib/app-routes.ts`~~ **Done on `main`.** Keep `lib/auth-paths.ts` aligned with AuthKit public paths / proxy.
7. Schema + Convex: add `by_updatedAt` on `users`; implement `api.users.list` and `api.users.getById` in `convex/users.ts` per RAD-64 (Listed user + auth from RAD-60/61).
8. Build Users page: table columns/affordances per RAD-61; `usePaginatedQuery` with `initialNumItems: 25`; Load more until `isDone`; testids `users-directory-table` / `users-load-more`.
9. Add `lib/coming-soon/` modules (default SaaS analytics + three code-swap modules); wire Demo page (KPI → chart → table) with testids and range/paging controls per RAD-62 / RAD-73.
10. Wire Global nav IA + Avatar menu + breadcrumbs per RAD-66; brand **SaaS Starter Kit**; strip duplicate frame actions from page bodies.
11. Preserve existing dashboard/settings/profile **body copy** inside the Content area (soft default).
12. E2E: update auth specs for new paths/frame; add `tests/e2e/shell.spec.ts` covering scenarios E–I; cover A–D and J as specified; enforce E2E WorkOS secrets fail-fast.
13. Run quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e` / `make e2e`.

## Acceptance criteria

### RAD-77 slice

- [ ] **Product:** App frame on `/dashboard/*` (Global nav + Global header + Global footer + Content area; no public-site Global header / Global nav / Global footer). Settings and Profile via Avatar menu only. Users and Coming soon are stubs per RAD-77. Page-body Sign out gone.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] **E2E:** Scenarios **C, E, F, G, J** from RAD-73 (stubs satisfy F’s page landmarks). Not H or I.

### Map destination (full App frame)

- [ ] **Product:** Closed route set live under `/dashboard/*` with the App frame (no public-site frame on App routes); Users list matches RAD-60/61/64; Demo page matches RAD-62; Profile/Settings via Avatar menu only.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] **E2E:** Scenarios **A–J** from RAD-73 pass via `pnpm test:e2e` / `make e2e` (desktop); required testids present; secrets mandatory (fail if missing).

## Open / deferred

- **Page copy (pack soft default):** preserve existing dashboard/settings/profile body copy inside the Content area; do not invent rewrites unless a later grill says otherwise.
- **Lucide icons:** locked in RAD-77 (`LayoutDashboard` / `Users` / `Sparkles`).
- **Demo page mock values:** build invents concrete arrays from the locked schema (RAD-62); do not invent alternate layouts or a runtime module switcher.
- **RBAC:** [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role), [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) — outside this handoff.
- **Users search/filter:** [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter).
- **RAD-71** canceled (cursor pagination absorbed into RAD-64).
- **E2E deferred (do not invent for Acceptance):** Users Load more interaction; mobile Sheet / collapse; desktop Global nav collapse affordance; Demo page module-switching; `make e2e-prod` as Acceptance.

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
- Format contract: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
- Glossary: [`CONTEXT.md`](../../CONTEXT.md)
