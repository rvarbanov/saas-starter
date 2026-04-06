## Specification

This document turns the high-level intent into a **concrete, agent-executable specification**: tools, versions, folder structure, configuration, and quality bars. It is designed so a human engineer and an AI coding agent can work from it without needing additional implicit context.

---

## Problem statement

We need a **reusable web application template** for building **SaaS-style apps** with:

- Auth and basic CRUD as first-class concerns.
- Clear separation of a **dashboard section**, **admin section**, and **public section**.
- Strong defaults for **testing, CI, and CD** so regressions are caught early.
- **Docker** so local and CI environments match and we avoid “works on my machine” drift.
- **SEO** as a first-class concern for public routes.
- A stack that is **stable, well-documented, and easy for AI agents to use**.

The template must be:

- **Easy to clone** and use as the basis for new products.
- **Predictable** in structure so agents can navigate and extend it safely.
- **Compatible with long-term evolution**: dependencies and patterns should not lock us into short-lived approaches.

---

## Tools & compatibility

### Core technologies

- **Framework:** React with Next.js (App Router or Pages Router; choice must be explicit and consistent in implementation).  
- **Backend / data layer:** Convex for data storage and server-side logic.  
- **Authentication:** **WorkOS** (AuthKit for Next.js). Use the official upstream pattern as a baseline; reference implementation: [WorkOS Next.js AuthKit example](https://github.com/workos/next-authkit-example/tree/main).  
- **UI components:** **shadcn/ui** (Radix + Tailwind conventions). For layout and dashboard-style patterns, the repo may follow or adapt ideas from [next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) (example only—not a hard dependency).  
- **API client generation (optional but supported):** **OpenAPI Generator** (or documented equivalent) for generated clients under `lib/api/` (or similar) when REST/OpenAPI is in play—keep scripts and docs in the repo.  
- **Testing:**
  - **Unit, integration, and component (UI) tests:** Vitest; test files use **`*.spec.ts`** / **`*.spec.tsx`** next to the file under test (same directory), unless E2E—see below. Implementation uses **`vitest.config.mts`** with separate projects (e.g. **Node** for `lib/**/*.spec.ts`, **happy-dom** + React for `components/**/*.spec.{ts,tsx}`); see **`IMPLEMENTATION.md` §11**.
  - **End-to-end (E2E) tests:** Playwright only; typically under `tests/e2e/` (or `e2e/`) because they span the whole app.
- **Tooling & developer experience:** **Biome** for linting and formatting (single toolchain for JS/TS/JSON/CSS where applicable). **Husky** is **optional**: add it when you want local Git hooks (e.g. pre-commit Biome); quality is enforced by **CI** without Husky. Document any hooks in `IMPLEMENTATION.md` and `../README.md` if you add them.  
- **Containerization (required):** **Docker** + **Docker Compose** for running the application locally in a reproducible way and for running **integration tests** inside containers so local setup differences do not break CI. See **Docker** and **CI/CD** sections below.  
- **Queues (background jobs):** A **queue / job system** is required for async work (retries, out-of-band processing). **Do not commit to a vendor until evaluated:** compare **[Vercel Queues](https://vercel.com/docs/queues)** (beta) with alternatives (e.g. **Inngest**, **Convex scheduled functions / actions**, **hosted Redis + BullMQ**, **AWS SQS**, etc.). Record the decision in `IMPLEMENTATION.md` (short ADR or “Queues” section).  
- **Package manager:** npm or pnpm (must be chosen and documented in implementation).

### Deployment & environments

- **Deployment platform:** Vercel for production and preview deployments.  
- **CI provider:** GitHub Actions (or another provider, but one must be chosen and encoded in this spec).  
- **Node.js:** Minimum **20.9** (matches [Next.js system requirements](https://nextjs.org/docs/app/getting-started/installation#system-requirements)). Pin at or above this in `package.json` `engines` and optionally `.nvmrc`; CI must use the same minimum.  
- **TypeScript:** Minimum **5.1.0** (Next.js built-in TS support; see [Next.js installation](https://nextjs.org/docs/app/getting-started/installation#set-up-typescript)).  
- **Development OS:** **macOS**, **Windows** (including **WSL**), or **Linux** — per Next.js.

### Browser / runtime support

- **Client browsers (Next.js defaults):** Chrome **111+**, Edge **111+**, Firefox **111+**, Safari **16.4+** (see [Next.js supported browsers](https://nextjs.org/docs/architecture/supported-browsers)); polyfills only if you explicitly target older clients.  
- **Server runtime:** **Node.js** on Vercel (Edge/Serverless specifics left to implementation but must be consistent).

---

## Repository layout (high-level)

At minimum, the repository should include:

- **Application code**
  - `app/` or `pages/`: Next.js application routes.
  - `components/`: shared React components (including **shadcn/ui**-style components under `components/ui/` or similar, per project convention).
  - `lib/` or `src/lib/`: utilities, services, shared logic; optional `lib/api/` for OpenAPI-generated clients.
  - `convex/`: Convex schema, functions, and utilities.

- **Sections**
  - **Public section**: public routes for marketing/landing, auth entry points, legal/SEO pages—see `IMPLEMENTATION.md` for the **required page list**.
  - **Dashboard section**: authenticated user area (e.g., `/app` or `/dashboard`).
  - **Admin section**: restricted admin area (e.g., `/admin`) with guardrails.

- **Tests**
  - **Colocated:** `*.spec.ts[x]` next to the module under test (Vitest).  
  - **E2E:** `tests/e2e/` (or `e2e/`) for Playwright.

- **Docker**
  - `Dockerfile` (and variants if needed, e.g. `Dockerfile.dev`).  
  - `docker-compose.yml` (and optionally `docker-compose.override.yml`) to run the app locally and to run **integration tests** in CI with a defined environment.

- **Configuration & scripts**
  - `package.json` with scripts for dev, build, test (unit/integration), test:integration (docker or documented), test:e2e, lint, format, and typecheck.
  - **`vitest.config.mts`** and **`vitest.setup.ts`** for Vitest (projects, coverage, component setup)—see **`IMPLEMENTATION.md` §11**.
  - `tsconfig.json` with strict TypeScript settings.
  - **Biome** configuration (`biome.json` or equivalent) for lint and format (replaces separate ESLint + Prettier for this template unless a documented exception is needed).
  - **Husky** (optional): `.husky/` only if you adopt local Git hooks; not required for spec-complete.
  - CI configuration (e.g., `.github/workflows/ci.yml`) including jobs that use **Docker** for integration tests where specified.
  - Vercel configuration (e.g., `vercel.json` or Vercel project settings documented in `IMPLEMENTATION.md`).

- **Docs**
  - `INTENT.md` (this project’s intent).  
  - `SPECIFICATION.md` (this file).  
  - `IMPLEMENTATION.md` (how to use and extend the template).  
  - Basic `../README.md` summarizing how to run, test, and deploy.

---

## Configuration & setup requirements

### Environment variables (file split)

- **`.env`** — **Committed.** Holds **non-secret** configuration: public URLs, feature flags, `NODE_ENV`-style defaults, empty or placeholder values for keys that are not sensitive. Must not contain production secrets.  
- **`.secret.example`** — **Committed.** Template listing **secret** variable names with placeholder values (e.g. `WORKOS_API_KEY=replace-me`). Documents what real secrets are needed.  
- **`.secret`** — **Gitignored. Never committed.** Developer or deploy environment copies from `.secret.example` and fills real secrets. CI and Vercel inject secrets via provider secret stores, not by committing `.secret`.

Also maintain **`.gitignore`** rules: ignore `.secret`, ignore local overrides like `.env.local` if used for machine-specific non-secret overrides (document the pattern in `IMPLEMENTATION.md`).

Convex and Next may use additional env files per their docs; align with the split above (secrets only in `.secret` / CI secrets).

### Scripts

`package.json` must define, at minimum:

- `dev`: start the local development environment via **Docker Compose** (e.g. `docker compose up --build`).  
- `build`: build the application for production.  
- `start`: run the production build locally.  
- `test`: run unit/integration suite via **Docker Compose** (container command runs Vitest and picks up `*.spec.*` colocated files); until Compose is standardized, **`pnpm test`** may invoke **`vitest run`** directly (see **`IMPLEMENTATION.md` §11**).  
- `test:coverage` (recommended): Vitest with **`@vitest/coverage-v8`** (same colocated specs as `test`).  
- `test:integration`: run integration tests **via Docker** (e.g. `docker compose run …`) as documented—required for spec-complete.  
- `test:e2e`: run Playwright E2E tests via **Docker Compose**.  
- `lint`: run Biome check (or equivalent), typically via a container command in Compose.  
- `format`: run Biome format (check or write, as documented), via Compose command.  
- `typecheck` (or equivalent): run TypeScript (`tsc --noEmit` or `next build` with type errors failing the build) via Compose command. Required for quality gates; if you omit a dedicated script, document that CI runs an equivalent check so merges cannot bypass types.  
- Optional: `generate:api` for OpenAPI client generation.

---

## Testing requirements

The template must enforce **testing as a first-class requirement**:

- **Unit / integration / UI tests**
  - Colocated **`*.spec.ts` / `*.spec.tsx`** next to the source file under test.  
  - **Integration tests** that depend on a consistent OS/stack (DB mocks, Convex test deployment, etc.) should run in **Docker** via `test:integration` and CI, per `IMPLEMENTATION.md`.

- **E2E tests (Playwright)**
  - There must be E2E coverage for:
    - At least one **public** flow (e.g. landing or marketing page loads and shows expected content; may overlap with auth entry).  
    - Core **WorkOS / AuthKit** auth flows (sign in / sign out / session behavior as applicable to the integration).  
    - Core CRUD flows in the **dashboard**.  
    - At least one critical **admin** flow.  
  - **Critical user flows must have at least one E2E test.**  
  - **Record CRUD (happy path):** For every **major feature** that **creates, updates, or fetches** persisted records (Convex-backed or equivalent), there must be at least one **happy-path E2E** that exercises **create**, **update**, and **fetch/read** (list or detail) as implemented for that feature. If a feature intentionally omits one operation (e.g. read-only), document it and cover the implemented operations only.

### Quality gates

- **No PR may be merged** unless CI (or an equivalent mandatory check) shows:
  - **Type checks** pass (via `typecheck` or a documented build that fails on type errors).  
  - **Lint** passes.  
  - **Unit/integration tests** pass (including **Docker-based integration** job if applicable).  
  - **E2E tests** pass: use the **full E2E suite on every PR** (or a documented subset that still covers changed areas without merging untested paths—prefer full suite for small teams).  
- New features should not be accepted without **corresponding tests** at appropriate layers.

---

## CI/CD specification

- **Continuous Integration (CI)**
  - On **every PR** (and typically on pushes to main): the pipeline must run, in order or parallelized as appropriate:
    - Install dependencies.
    - Type checks.
    - Lint.
    - Unit/integration tests via **Docker Compose** (Vitest, colocated `*.spec.*`).
    - **Full E2E suite via Docker Compose** (Playwright).
  - Direct pushes to branches without a PR should still run the same checks when CI is triggered; release branches follow the same bar unless you document an exception (not recommended for this template).

- **Continuous Deployment (CD)**
  - Successful merges to the main branch should trigger:
    - Build and deploy to Vercel.  
    - Optional: smoke E2E tests against the deployed environment.

CI configuration should be **explicit** (e.g., a GitHub Actions workflow file) and should document:

- Which branches deploy where (preview vs production).  
- Required secrets (CI provider and Vercel—never committed; use `.secret` pattern locally only).

---

## Acceptance criteria (spec-level)

The template is considered **spec-complete** when:

- The repository includes all required folders, configs, and scripts described above, including **Dockerfile** and **docker-compose** for local app + **integration tests in Docker**.  
- A new repo cloned from this template can:
  - Run in development with a **single clear set of commands** (including **Docker Compose** path documented).  
  - Run unit/integration (including **integration via Docker**), and E2E tests successfully after configuration.  
  - Be deployed to Vercel via the documented CI/CD flow.  
- **Queues:** A written **evaluation** of Vercel Queues vs alternatives exists in `IMPLEMENTATION.md` before locking a vendor.  
- The **public**, **dashboard**, and **admin** sections exist with the **required pages** listed in `IMPLEMENTATION.md`, **WorkOS**-based auth, and basic CRUD for at least one representative resource.  
- **Roles** (super admin, manager, team member) and **multi-role users** are reflected in data model and access checks per `IMPLEMENTATION.md`.  
- At least one E2E test covering each major section, and **happy-path E2E** for create / update / fetch for that resource (or documented scope per above).  
- `INTENT.md`, `SPECIFICATION.md`, and `IMPLEMENTATION.md` are present and consistent.

**Use:** This `SPECIFICATION.md` should be treated as the source of truth for tools, structure, and quality bars. The implementation doc explains how to realize this spec in code and workflows.
