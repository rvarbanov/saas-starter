# Authenticated dashboard shell

- **Map:** https://linear.app/radi-dev/issue/RAD-59/wayfinder-authenticated-dashboard-shell-handoff
- **Packed:** 2026-08-14
- **Status:** packed
- **Source children:** RAD-67, RAD-60, RAD-61, RAD-64, RAD-65, RAD-62, RAD-66, RAD-68, RAD-73

## Destination

A later build session implements an authenticated app shell: sidebar + slim top bar on `/dashboard/*`, Users directory backed by Convex `users.list` / `users.get`, and a static Coming soon demo (KPIs / chart / table). When this handoff’s Acceptance criteria pass, the destination of the Wayfinder map is met for the build — this packed file is decision-complete; it does not implement UI.

## Out of scope

- Admin section / separate admin shell
- Multi-tenant workspaces / team UI
- Real billing or business metrics (Coming soon is illustrative mocks only)
- Mobile-first polish beyond “it works”
- Dark theme / theme switching
- Building or shipping the UI inside the Wayfinder map effort (plan-only; build is a later session)
- Full product E2E beyond shell routes + public/auth chrome regression (about, pricing, admin, etc.)

## Decisions

### shadcn component inventory for shell (RAD-67)

- Stack already locked: `base-nova` / Base UI via [`components.json`](../../components.json); today only `components/ui/button.tsx`.
- Add via CLI (not retired `shadcn-ui`):  
  `pnpm exec shadcn add sidebar card table chart separator avatar dropdown-menu breadcrumb sheet badge tooltip`
- Chart pulls `recharts@3.8.0`.
- Prefer `--dry-run` / `--diff` first; watch for overwrite of existing `button.tsx`. Do not re-init or switch away from the radix/base-nova preset.
- Soft later (only if Coming soon/table grows beyond this map): tabs / select / checkbox.

### Users list authorization (RAD-60)

**Interim policy** (directory reads for this shell):

- **Who:** any principal with a valid WorkOS/JWT via `ctx.auth.getUserIdentity()` (Convex `users` row **not** required).
- **What:** directory collection list **and** by-id of other users over all `users` rows in the deployment.
- **Deny (no identity):** throw `"Not authenticated"`.
- **Enforce in:** Convex only (no extra UI/route role gate for the interim rule).
- **Writes / admin management:** out of scope; existing self-service APIs unchanged.
- **Field floor (directory only):** never return `tokenIdentifier` or `workosUserId`. Positive columns owned by RAD-61. `getMe` may keep identity link fields for self.

**Debt (not blocking this build):** [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role) (RBAC / `user_role`); [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) (restrict directory to Super admin or Manager).

### Users table columns and affordances (RAD-61)

- **Visible columns (L→R):** First name · Last name · Email · Created at · Updated at (`firstName`, `lastName`, `email`, `createdAt`, `updatedAt`).
- **Directory DTO:** `_id`, `firstName`, `lastName`, `email`, `createdAt`, `updatedAt` only. Never `name`, `appUserId`, `tokenIdentifier`, `workosUserId`.
- **Sort:** fixed `updatedAt` descending; headers non-interactive in v1.
- **~~Interim 50-row hard cap + truncation footer~~** — **superseded by RAD-64** (cursor pagination from day one). [RAD-71](https://linear.app/radi-dev/issue/RAD-71/users-list-cursor-pagination) canceled as absorbed.
- **UI (v1):** blank empty name cells; locale absolute datetimes in client TZ; plain-text email; ellipsis + `title` overflow; no row-click; no actions column; no current-user highlight; page title `Users`; empty `"No users yet"`; table skeleton loading; `"Couldn't load users"` + Retry on error; all five columns on narrow viewports (horizontal scroll OK).
- **Pagination chrome:** Load more (append until `isDone`) — not the superseded 50-cap footer.
- **Search/filter:** deferred — [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter).

### Convex list-users API shape (RAD-64)

Implement later in `convex/users.ts` (alongside existing `getMe` / `store`).

- **Surface:** `api.users.list` (paginated directory), `api.users.get` (by-id directory read).
- **Shared:** directory validator/mapper; keep `userDocValidator` for self-service (`getMe` may still expose identity link fields).
- **Auth:** same as RAD-60 — JWT via `ctx.auth.getUserIdentity()` only; deny → `"Not authenticated"`.
- **Directory DTO / returns item** (names optional to match schema): `_id`, `firstName?`, `lastName?`, `email`, `createdAt`, `updatedAt`. Never `tokenIdentifier`, `workosUserId`, `appUserId`, or `name`.
- **Index:** add `by_updatedAt` on `["updatedAt"]`. List: that index + `.order("desc").paginate(...)`.

**`users.list`**

| | |
| --- | --- |
| **Args** | `{ paginationOpts }` only (no sort/search/filter) |
| **Sort** | Fixed `updatedAt` desc (server-side) |
| **Returns** | `{ page, continueCursor, isDone }` (standard Convex pagination) |
| **Page size** | Silent clamp `numItems` ≤ **100**; UI default `initialNumItems: 25` |
| **UI chrome** | **Load more** until `isDone` |

**`users.get`**

| | |
| --- | --- |
| **Args** | `{ userId: Id<"users"> }` |
| **Returns** | directory row or **`null`** if missing (not a throw) |

### Route map for shell pages (RAD-65)

**Closed path set:**

- `/dashboard`
- `/dashboard/settings`
- `/dashboard/profile`
- `/dashboard/users`
- `/dashboard/coming-soon`

- Nest under `/dashboard`; all `/dashboard/*` auth-gated.
- Shell layout: `app/dashboard/layout.tsx` with layout-only `withAuth({ ensureSignedIn: true })` (+ existing proxy).
- **No** redirects from old `/settings` or `/profile` — delete top-level `app/settings` and `app/profile`.
- Add `lib/app-routes.ts` for shell path constants; keep `lib/auth-paths.ts` for AuthKit public paths.
- Update code, tests, and docs that still reference top-level settings/profile.

### Coming soon demo content (RAD-62)

- Route: `/dashboard/coming-soon`. **Static mocks only** (no Convex).
- **Default pack:** SaaS analytics. Also ship code-swap packs (no runtime switcher): shadcn classic, accounts receivable (AR), sport teams.
- Suggested modules: `lib/coming-soon/{types,saas-analytics,shadcn-classic,accounts-receivable,sport-teams,index}.ts`.
- Page title: **Coming soon**. Subtitle: `Illustrative demo metrics — not connected to live data.`
- Layout: four KPI cards → single-series area chart → table.
- Chart ranges: Last 3 months (**default**) / 30d / 7d. KPI anatomy matches shadcn dashboard reference (no sparklines).
- Table: 24 rows, 8 per page; five slots — name · category · status (badge) · metric · owner; no drag / bulk / customize-columns.
- Build invents concrete mock arrays from this locked schema (do not invent alternate layouts).

### Sidebar IA and chrome (RAD-66)

- On `/dashboard/*`, **replace** marketing `GlobalNav` / `GlobalFooter`.
- Slim top bar: breadcrumbs + avatar menu (+ sidebar trigger as needed). Landmarks: `data-testid="app-sidebar"`, `data-testid="app-topbar"`.
- Public chrome via `app/(public)/` route group (**include auth pages** so they keep public chrome). Shell stays under `app/dashboard/layout.tsx`.
- Sidebar (flat, icon + label), order:
  1. Dashboard → `/dashboard`
  2. Users → `/dashboard/users`
  3. Coming soon → `/dashboard/coming-soon`
- Brand label: **SaaS Starter Kit** → `/dashboard`.
- Active state: exact match on Dashboard; prefix match elsewhere.
- Desktop sidebar collapsible; **default expanded**. Mobile: Sheet.
- Avatar menu (avatar-only trigger): Profile → Settings → separator → Sign out. Profile and Settings are **menu-only** (not sidebar links).
- Breadcrumbs: `Dashboard` + leaf.
- Strip page-body duplicates of shell actions (e.g. redundant sign-out / nav) in the later build.
- Exact Lucide icons: soft default — build picks sensible icons (see Open / deferred).

### Handoff spec format and home (RAD-68)

- Canonical packed handoff lives under `docs/handoffs/` (this file). Format/home locked in [`CONTRACT.md`](./CONTRACT.md).
- Linear posts **pointer** resolution comments only (path + destination met + packed child IDs) — not a second full copy.
- Authority: after pack, **this file wins** over Linear summaries. Post-pack choice changes require re-grill + re-pack.

### E2E expectations for shell build (RAD-73)

**Format:** named scenario checklist — route(s) + user action + primary assertion landmarks. No full Playwright source in this handoff.

**Landmarks:** hybrid — accessible names for public/auth chrome and IA labels; locked `data-testid`s for new shell interactives.

**testid contract (build must add):**

| testid | Purpose |
|--------|---------|
| `app-sidebar` | Authenticated sidebar root |
| `app-topbar` | Slim top bar |
| `users-directory-table` | Users data table |
| `users-load-more` | Load more control (UI ok; **not** required in E2E this map) |
| `coming-soon-chart` | Demo chart region |
| `coming-soon-table` | Demo table |
| `coming-soon-table-next` | Table paging next |

Nav labels, range buttons (`3m` / `30d` / `7d`), avatar menu items, and existing `convex-user-profile` / `convex-status` stay accessible-name / existing testids.

**Closed Acceptance scenarios:**

| ID | Scenario |
|----|----------|
| A/B | Keep today’s public/auth assertion floor (home + Global nav on `/` and `/sign-in`; sign-in/sign-up shell). Update if `(public)` move breaks them. |
| C | Unauthenticated cannot stay on all five: `/dashboard`, `/dashboard/users`, `/dashboard/coming-soon`, `/dashboard/settings`, `/dashboard/profile`. Retire top-level `/settings` and `/profile` unauth tests when those routes are deleted. |
| D | Real WorkOS setup login + authenticated proof of gated shell access (dashboard + shell subpages). |
| E | On `/dashboard`: `app-sidebar` + `app-topbar` visible; Global nav + marketing footer absent. |
| F | Full sidebar tour: Dashboard → Users → Coming soon → Dashboard (URL + page landmark each hop). |
| G | Avatar menu → Settings and Profile (URLs + landmarks); Settings/Profile are **not** sidebar links. |
| H | Users: `users-directory-table` visible; column headers First/Last/Email/Created at/Updated at; ≥1 data row. **Load more interaction not in E2E.** |
| I | Coming soon: title + subtitle; `coming-soon-chart` + `coming-soon-table`; toggle range to **30d**; one click `coming-soon-table-next`. |
| J | Update-in-place existing authenticated coverage: Convex profile; session across shell paths + home; authenticated `/sign-up` → `/dashboard`; sign-out **via avatar menu**. |

**Organization & bar:**

- Update `tests/e2e/auth.spec.ts` / `auth-authenticated.spec.ts` / `auth-sign-out.spec.ts` for new paths/chrome.
- Add `tests/e2e/shell.spec.ts` on the **authenticated** project for E–I.
- Acceptance E2E command: `pnpm test:e2e` / `make e2e` only (not `e2e-prod`).
- Desktop Chrome / Chromium only.

**Secrets (mandatory):** every environment that runs E2E — including local — must have `E2E_WORKOS_EMAIL` and `E2E_WORKOS_PASSWORD` (plus existing WorkOS cookie/API secrets per AGENTS.md). If missing, E2E **fails** (no omitting/skipping authenticated projects). Build updates Playwright config/setup to enforce this.

## Build checklist

1. Add shadcn components: `pnpm exec shadcn add sidebar card table chart separator avatar dropdown-menu breadcrumb sheet badge tooltip` (dry-run first; protect `button.tsx`).
2. Move public/marketing/auth routes under `app/(public)/` so GlobalNav/Footer apply only there; keep shell free of marketing chrome.
3. Add `app/dashboard/layout.tsx` with shell chrome (sidebar + slim top bar) and layout-only `withAuth({ ensureSignedIn: true })`.
4. Create nested routes: `app/dashboard/page.tsx` (home), `app/dashboard/settings/page.tsx`, `app/dashboard/profile/page.tsx`, `app/dashboard/users/page.tsx`, `app/dashboard/coming-soon/page.tsx`.
5. Delete top-level `app/settings/` and `app/profile/`; update all imports, links, docs, and tests — **no** legacy redirects.
6. Add `lib/app-routes.ts` with the closed shell path set; keep `lib/auth-paths.ts` aligned with AuthKit public paths / proxy.
7. Schema + Convex: add `by_updatedAt` on `users`; implement `api.users.list` and `api.users.get` in `convex/users.ts` per RAD-64 (directory DTO + auth from RAD-60/61).
8. Build Users page: table columns/affordances per RAD-61; `usePaginatedQuery` with `initialNumItems: 25`; Load more until `isDone`; testids `users-directory-table` / `users-load-more`.
9. Add `lib/coming-soon/` packs (default SaaS analytics + three code-swap packs); wire Coming soon page (KPI → chart → table) with testids and range/paging controls per RAD-62 / RAD-73.
10. Wire sidebar IA + avatar menu + breadcrumbs per RAD-66; brand **SaaS Starter Kit**; strip duplicate shell actions from page bodies.
11. Preserve existing dashboard/settings/profile **body copy** inside the new content area (soft default).
12. E2E: update auth specs for new paths/chrome; add `tests/e2e/shell.spec.ts` covering scenarios E–I; cover A–D and J as specified; enforce E2E WorkOS secrets fail-fast.
13. Run quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e` / `make e2e`.

## Acceptance criteria

- [ ] **Product:** Closed route set live under `/dashboard/*` with shell chrome (no GlobalNav/Footer on shell); Users directory matches RAD-60/61/64; Coming soon matches RAD-62; Profile/Settings via avatar menu only.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] **E2E:** Scenarios **A–J** from RAD-73 pass via `pnpm test:e2e` / `make e2e` (desktop); required testids present; secrets mandatory (fail if missing).

## Open / deferred

- **Page copy (pack soft default):** preserve existing dashboard/settings/profile body copy inside the new content area; do not invent rewrites unless a later grill says otherwise.
- **Lucide icons (pack soft default):** build picks sensible Lucide icons for Dashboard / Users / Coming soon; do not invent a locked icon map in this handoff.
- **Coming soon mock values:** build invents concrete arrays from the locked schema (RAD-62); do not invent alternate layouts or a runtime pack switcher.
- **RBAC:** [RAD-69](https://linear.app/radi-dev/issue/RAD-69/implement-rbac-user-role), [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-or-manager) — outside this handoff.
- **Users search/filter:** [RAD-72](https://linear.app/radi-dev/issue/RAD-72/users-list-searchfilter).
- **RAD-71** canceled (cursor pagination absorbed into RAD-64).
- **E2E deferred (do not invent for Acceptance):** Users Load more interaction; mobile Sheet / collapse; desktop sidebar collapse affordance; Coming soon pack-switching; `make e2e-prod` as Acceptance.

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
- Format contract: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
