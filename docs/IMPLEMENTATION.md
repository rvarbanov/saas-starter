## Implementation guide

This document explains **how to realize the intent and specification in code**. It is written so a human engineer and an AI coding agent can follow it step by step to create and evolve applications from this template.

### Stack choices (reference)


| Area                   | Choice                | Notes                                                                                                                                                                |
| ---------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                   | **WorkOS** (AuthKit)  | Align with the [WorkOS Next.js AuthKit example](https://github.com/workos/next-authkit-example/tree/main): env vars, callbacks, and session handling.                |
| UI                     | **shadcn/ui**         | Use for primitives and patterns; keep components consistent with the documented `components/ui/` layout.                                                             |
| Dashboard UX (example) | Optional reference    | [next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) is an **example** for layout/navigation patterns—adapt, do not copy blindly. |
| Lint / format          | **Biome**             | Prefer `biome check` / `biome format` over mixing ESLint + Prettier unless the spec is explicitly updated.                                                           |
| Git hooks              | **Optional (Husky)**  | Add later if you want pre-commit/pre-push checks locally. **CI** remains the source of truth for lint/tests; Husky is a convenience, not required.                   |
| OpenAPI                | **OpenAPI Generator** | Optional generated REST clients under `lib/api/`; keep `generate:api` (or equivalent) documented.                                                                    |
| Containers             | **Docker + Compose**  | Required for reproducible local runs and **integration tests in CI**—see §8.                                                                                         |


---

## 0. Required routes & pages

### 0.1 Public (no auth) — minimum

These routes must exist for **SEO**, **trust**, and **compliance** (adjust paths slightly if needed; keep equivalents):


| Route (example)                       | Purpose                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                                   | Marketing / landing — primary indexable page                                                |
| `/about`                              | Company / product story (indexable, internal links)                                         |
| `/contact`                            | Contact or lead form (indexable)                                                            |
| `/privacy`                            | Privacy policy                                                                              |
| `/terms`                              | Terms of service                                                                            |
| `/pricing`                            | Pricing / plans (if SaaS monetization applies; otherwise a single “Contact sales” CTA page) |
| Auth entry + OAuth/OIDC **callbacks** | As required by **WorkOS AuthKit** (see WorkOS docs)                                         |


**SEO:** All public pages should use the Next.js **[Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)** API, stable titles/descriptions, canonical URLs where duplicates exist, and link to **`/sitemap.xml`** and **`/robots.txt`** (or App Router equivalents). See **§7**.

### 0.2 Private (behind auth) — minimum


| Route (example)             | Purpose                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `/dashboard` or `/app`      | Authenticated home; entry to CRUD for the primary resource                                   |
| `/profile` or `/settings`   | User’s own account/profile                                                                   |
| `/team` or `/workspace/...` | **Manager** scope: manage the team(s) they manage (omit if single-tenant MVP defers team UI) |
| `/work` or `/tasks/...`     | **Team member** scope: work assigned to them (representative list/detail)                    |
| `/admin/...`                | **Super admin** only: global admin (users, orgs, settings)                                   |


Exact paths are flexible; **E2E and authorization** must match the **role model** in **§6**.

---

## 1. Per-tool setup (official docs)

Use these as the install / setup source of truth. Versions must satisfy `**SPECIFICATION.md`** (Node 20.9+, TS 5.1+, etc.).


| Tool                  | Official getting started                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js**           | [Installation](https://nextjs.org/docs/app/getting-started/installation), [Project structure](https://nextjs.org/docs/app/getting-started/project-structure) |
| **React**             | [Learn React](https://react.dev/learn)                                                                                                                       |
| **TypeScript**        | [TypeScript handbook](https://www.typescriptlang.org/docs/)                                                                                                  |
| **Tailwind CSS**      | [Install Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)                                                           |
| **shadcn/ui**         | [Installation (Next.js)](https://ui.shadcn.com/docs/installation/next)                                                                                       |
| **WorkOS AuthKit**    | [AuthKit](https://workos.com/docs/authkit), [Next.js example repo](https://github.com/workos/next-authkit-example/tree/main)                                 |
| **Convex**            | [Quickstart](https://docs.convex.dev/quickstart), [Next.js](https://docs.convex.dev/client/react/nextjs)                                                     |
| **Vitest**            | [Getting started](https://vitest.dev/guide/)                                                                                                                 |
| **Playwright**        | [Installation](https://playwright.dev/docs/intro)                                                                                                            |
| **Biome**             | [Getting started](https://biomejs.dev/guides/getting-started/)                                                                                               |
| **pnpm**              | [Installation](https://pnpm.io/installation) (or **npm**: [docs](https://docs.npmjs.com/))                                                                   |
| **Docker**            | [Get Docker](https://docs.docker.com/get-docker/), [Compose](https://docs.docker.com/compose/)                                                               |
| **OpenAPI Generator** | [Installation](https://openapi-generator.tech/docs/installation)                                                                                             |
| **Vercel**            | [Docs home](https://vercel.com/docs), [Deploying Next.js](https://vercel.com/docs/frameworks/nextjs)                                                         |
| **GitHub Actions**    | [Quickstart](https://docs.github.com/en/actions/quickstart)                                                                                                  |
| **Husky** (optional)  | [Husky](https://typicode.github.io/husky/)                                                                                                                   |


---

## 2. Bootstrapping a new app from this template

**Environment:** Use **Node.js 20.9+**, **TypeScript 5.1+**, and a supported OS (macOS, Windows with WSL, or Linux) per [Next.js system requirements](https://nextjs.org/docs/app/getting-started/installation#system-requirements). Match these in local dev, CI, and `package.json` `engines`.

### 2.1 Clone and install

1. Create a new repository from this template (via “Use this template” or by cloning and pushing to a new origin).
2. Install dependencies using the chosen package manager (npm or pnpm), as documented in `../README.md`.

### 2.2 Configure environment (`.env` + `.secret`)

Per `**SPECIFICATION.md`**:

1. `**.env**` — Committed. Non-secret keys and safe defaults only.
2. `**.secret.example**` — Committed. Placeholder names for every secret.
3. `**.secret**` — **Not committed.** Copy from `.secret.example`, fill real values locally; CI/Vercel use their own secret stores.

Fill **WorkOS / AuthKit** and **Convex** values according to [WorkOS docs](https://workos.com/docs) and [Convex dashboard](https://dashboard.convex.dev/).

### 2.3 Run the dev environment (Docker Compose standard)

1. Start the full local stack with **Docker Compose** (for example `docker compose up --build`).
2. Use Compose service commands for app/dev tasks (e.g. `docker compose exec app <cmd>` as documented in your project scripts).
3. Verify public, auth, dashboard, and admin sections.

### 2.4 Native dev (optional fallback)

If Docker is temporarily unavailable, native dev may be used only as a fallback for troubleshooting. The canonical path for day-to-day development and all tests is **Docker Compose**.

---

## 3. Routing strategy & SEO

### 3.1 URL strategy

- Prefer **subdirectory routing** on a **single primary domain** (e.g. `example.com/pricing`, `example.com/dashboard`) so **link equity** and **crawl budget** stay consolidated—avoid separate marketing subdomains for core content unless there is a strong reason.  
- Use **Next.js App Router** file conventions; keep URLs **stable** and **readable** (`/blog/slug` not opaque IDs in public marketing).  
- Implement `**generateMetadata`** (or static metadata) for every **public** page: `title`, `description`, `openGraph`, `robots` as appropriate.  
- Provide `**sitemap.ts`** / `**sitemap.xml**` and `**robots.ts**` for public routes.  
- Use **semantic HTML** (`main`, `nav`, `h1` once per page) for accessibility and SEO.  
- **Performance** affects SEO: follow [Next.js optimizing](https://nextjs.org/docs/app/building-your-application/optimizing) (images, fonts, caching).

### 3.2 Auth vs indexability

- **Do not** expose private dashboards to crawlers: `noindex` on authenticated shells if ever mistakenly hit, and enforce auth server-side.  
- Public marketing pages should be **fully indexable** unless intentionally gated.

---

## 4. Roles & authorization

### 4.1 Role types


| Role            | Scope                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **Super admin** | Global: all orgs/teams, all admin routes, sensitive settings.                                                  |
| **Manager**     | Manage **their team(s)** — members, assignments, team settings—not global platform config.                     |
| **Team member** | **Self** + **work they are responsible for** (tasks, tickets, items)—no team-wide admin unless also a manager. |


### 4.2 Multiple roles per user

- A single user **may hold more than one role** (e.g. manager + team member).  
- Implement with a **set/array of roles** on the user (or membership) record in **Convex**, and evaluate **least privilege** per action: union of permissions from all roles, with explicit **deny** rules for dangerous actions.  
- Map **WorkOS** identity → internal user; store roles in Convex; enforce in **Convex functions** (queries/mutations) and **Next.js** route/middleware guards.

---

## 5. Navigation

- **Public nav:** Home, product/pricing, About, Contact, legal links, Sign in.  
- **Authenticated nav:** Dashboard, Work, Team (if manager+), Profile, Admin (if super admin), Sign out.  
- **Responsive:** mobile drawer / sheet (shadcn patterns); **active state** via `usePathname()`.  
- **Do not** duplicate dozens of links; group secondary items in footers on marketing pages.

---

## 6. Layout

- **Root layout:** fonts, theme provider (if any), analytics (public only where required).  
- **Marketing layout:** header + footer, max-width content.  
- **App shell (dashboard):** sidebar + top bar (see shadcn dashboard patterns); consistent **content area** padding.  
- **Admin layout:** distinct from user dashboard if it reduces accidental privileged actions (optional second shell).

---

## 7. Design theme & guidelines

- **Base:** **shadcn/ui** + **Tailwind**; use CSS variables for **light/dark** if supported ([theming](https://ui.shadcn.com/docs/theming)).  
- **Typography:** one sans stack (e.g. Geist or project default); limit **font sizes** to a small scale (text-sm / base / lg / xl).  
- **Spacing:** consistent `gap-*` and `p-*` from Tailwind scale; avoid arbitrary pixel values unless necessary.  
- **Color:** semantic tokens (`primary`, `destructive`, `muted`) via shadcn; ensure **WCAG contrast** for text.  
- **Components:** prefer shadcn primitives; customize in `components/ui/` only when needed.  
- **Icons:** one library (e.g. Lucide, bundled with shadcn).  
- **Motion:** subtle only; respect `prefers-reduced-motion`.

---

## 8. Docker

### 8.1 Goals

- Same runtime assumptions for **every developer** and **CI**.  
- Run **integration tests** inside Docker (see `**SPECIFICATION.md`**).

### 8.2 Files

- `**Dockerfile**` — multi-stage: deps → build → runtime (Node LTS aligned with spec).  
- `**docker-compose.yml**` — services: `app` (and optionally `test` target for integration tests).  
- `**.dockerignore**` — exclude `node_modules`, `.git`, `.secret`, etc.

### 8.3 Docs

- Document commands: `docker compose up`, `docker compose run --rm app pnpm test:integration` (or your chosen script).  
- Link: [Docker Compose](https://docs.docker.com/compose/).

---

## 9. Queues (evaluation before commitment)

**Requirement:** async jobs (email, webhooks, heavy processing) need a **queue** or **workflow** system.

**Do not pick a vendor until evaluated.** Compare at least:

- **[Vercel Queues](https://vercel.com/docs/queues)** — beta; tight Vercel integration.  
- **[Inngest](https://www.inngest.com/docs)** (or similar) — durable workflows, serverless-friendly.  
- **Convex** — [scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions), [actions](https://docs.convex.dev/functions/actions) for async side effects.  
- **Redis + BullMQ** (self-hosted or managed) — traditional queues.  
- **AWS SQS** (+ worker on Lambda/ECS) — if already on AWS.

Record the decision (pros/cons for *this* template) in this section or `docs/adr-queues.md` and then update `**SPECIFICATION.md`** if the choice becomes canonical.

---

## 10. OpenAPI Generator

- Keep a `**generate:api**` (or equivalent) script and config if you generate clients from an OpenAPI spec.  
- Default output: e.g. `lib/api/generated/` (gitignore generated files **or** commit if team prefers reproducible builds—pick one and document).  
- Docs: [OpenAPI Generator](https://openapi-generator.tech/docs/installation).

---

## 11. Testing: Vitest + Playwright

### 11.1 Colocated specs

- Name tests **`*.spec.ts`** or **`*.spec.tsx`** and place **next to** the file under test (e.g. `button.tsx` + `button.spec.tsx`).  
- **E2E** remains in `**tests/e2e/`** (or `e2e/`) — Playwright spans the whole app.

### 11.2 Vitest configuration

- **Config file:** `**vitest.config.mts`** (ESM). Keeps `**@vitejs/plugin-react**` and Vitest on the same module graph as the CLI (avoid loading the React plugin through CommonJS `require()`).  
- **Path alias:** `**@`** → repo root (matches TypeScript paths) on the root config **and** repeated per **project** via a shared `**resolve`** object (Vitest projects do not inherit root `**resolve**` without an inline `**extends**` pattern that is awkward to type with `**defineProject**`).  
- **Shared excludes:** one array built from `**configDefaults.exclude`** plus `.next`, `dist`, `build`, `out`, `coverage`—reused by both projects so globs stay aligned.  
- **Root `test` defaults:** `**passWithNoTests: false`** (mis-typed `include` fails the run), `**testTimeout: 10_000**`, `**clearMocks: true**`, `**restoreMocks: true**` (predictable `vi.mock` cleanup between tests).  
- **Projects** (Vitest `defineProject`):
  - `**unit`** — `include`: `lib/**/*.spec.ts`; **environment:** `node`.  
  - `**components`** — `include`: `components/**/*.spec.{ts,tsx}`; **environment:** `**happy-dom`**; **plugins:** `@vitejs/plugin-react`; **setupFiles:** `vitest.setup.ts`.
- **Setup (`vitest.setup.ts`):** import `**@testing-library/jest-dom/vitest`** so matchers like `toBeInTheDocument()` are available in component specs.  
- **DOM environment:** `**happy-dom`** is used for component tests (fast, good Testing Library support). If you switch to `**jsdom**`, some dependency versions use ESM with top-level `await` and can break Vitest’s default `**forks**` pool; prefer `**pool: "threads"**` on the affected project or stay on **happy-dom** unless you need jsdom-specific APIs.  
- **Coverage:** `**@vitest/coverage-v8`**; `**pnpm test:coverage**` runs `**vitest run --coverage**`. Reporters include **text**, **json**, **html**, **lcov**. **include:** `lib/**/*.ts` and `components/**/*.{ts,tsx}`; **exclude:** `**/*.spec.*`, `**/*.test.*`, `**/*.d.ts`, `**components/ui/**`** (generated shadcn), `node_modules`, **`.next`**.  
- **Reporters:** default `**default`**; when `**process.env.CI**` is set, `**github-actions**` is added for CI log annotations.  
- **Scripts:** `**pnpm test`** → `**vitest run**`; `**pnpm test:coverage**` → `**vitest run --coverage**`.

### 11.3 Component tests and Next.js

- Use **React Testing Library** (`@testing-library/react`).  
- **Mock Next.js modules** in the spec when needed (e.g. `**next/link`** as a plain `<a href={href}>`) so tests do not depend on the App Router implementation.  
- **shadcn `Button` + `asChild` + `Link`:** the DOM node may be an `<a>` with `**role="button"`** (not `**role="link"**`). Query with `**getByRole("button", { name: /…/ })**` (or `getByText` + assertions on `href`) so tests match accessible roles.  
- Prefer colocating specs under `**components/**` (not under `components/ui/` unless you intentionally test a primitive).

### 11.4 Integration tests in Docker

- Implement `**test:integration**` to run Vitest (or a dedicated integration suite) **inside Docker Compose** so DB/Convex test deps match CI.  
- CI must run the same Docker-based integration job (see `**SPECIFICATION.md`**).

### 11.5 E2E minimum

Align with `**SPECIFICATION.md**`: public, WorkOS flows, dashboard CRUD happy paths (create/update/fetch), admin; record-level requirements for major features.

### 11.6 Commands

- `dev` — Docker Compose local stack (`docker compose up --build` or project wrapper script); until Compose is wired, `**pnpm dev**` may run Next directly—see `**README.md**`.  
- `test` — `**pnpm test**` runs Vitest (`*.spec.*` colocated); when the template standardizes on Compose, the same suite may be invoked inside a container.  
- `test:coverage` — `**pnpm test:coverage**` (Vitest + v8 coverage).  
- `test:integration` — Docker Compose integration test command.  
- `test:e2e` — Docker Compose Playwright command.

---

## 12. CI/CD

### 12.1 CI (GitHub Actions)

Official: [GitHub Actions quickstart](https://docs.github.com/en/actions/quickstart).

**Pipeline stages (typical):**

1. Checkout
2. Setup Node (20.9+) + pnpm/npm
3. Install deps (cache)
4. `typecheck` → `lint` → `test` (Vitest); optionally `**test:coverage`** for coverage reports
5. **Docker:** build image and run `**test:integration`**
6. Install Playwright browsers → `**test:e2e**`
7. (Optional) build artifact

Secrets: use **GitHub Actions secrets** — never raw `.secret` in CI.

### 12.2 CD — Vercel

Official: [Vercel documentation](https://vercel.com/docs), [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs).

**Steps:**

1. Import Git repo into Vercel.
2. Set **environment variables** in Vercel dashboard (mirror `.secret.example` keys).
3. Production branch = `main`; enable **Preview** for PRs.
4. Configure **Convex** production deployment URLs and WorkOS redirect URIs for production domains.
5. After deploy: optional smoke E2E against preview URL.

Document any **Vercel Queues** or **Edge** config here once chosen (§9).

---

## 13. Biome (required); Husky (optional)

- **Biome:** `biome check`, `biome format` in scripts and CI.  
- **Husky:** optional pre-commit; keep hooks fast.

---

## 14. Sections: public, dashboard, admin (summary)

- **Public:** marketing + legal + auth entry; **SEO** metadata on each.  
- **Dashboard:** authenticated CRUD for primary resource; role-aware UI.  
- **Admin:** super-admin-only global tools.

Use **Convex** for data and **WorkOS** for identity; enforce **§4** in every mutation.

---

## 15. Security practices (baseline)

- Never commit `**.secret`** or production keys.  
- Map WorkOS users to Convex; validate **roles** server-side.  
- No secrets in client bundles.

---

## 16. Working with an AI coding agent

- Follow `**INTENT.md`**, `**SPECIFICATION.md**`, and this file.  
- Ask when roles, routes, or queue choice are ambiguous.

---

## 17. Extending the template

- Update `**INTENT.md**` / `**SPECIFICATION.md**` when defaults change.  
- Add `*.spec.*` and E2E when adding features.

---

**Use:** This `**IMPLEMENTATION.md`** is the operational playbook for humans and AI agents.
