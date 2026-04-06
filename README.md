# SaaS Starter Kit (AI-Ready)

A production-ready template for **SaaS-style** apps: public, dashboard, and admin areas, **SEO-focused** routing, **role-based access**, strong testing, **Docker** parity, and deployment to **Vercel**.

**Authoritative docs:** **[INTENT.md](docs/INTENT.md)** · **[SPECIFICATION.md](docs/SPECIFICATION.md)** · **[IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** (detailed setup, SEO, roles, Docker, CI/CD, per-tool links).

---

## Overview

Stack: **Next.js**, **WorkOS AuthKit**, **Convex**, **shadcn/ui**, **Vitest** (`*.spec.*` colocated), **Playwright** (E2E), **Biome**, **Docker** + **Compose**, optional **OpenAPI Generator**, **GitHub Actions** → **Vercel**.

---

## Technology stack (summary)

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16+ (App Router, Turbopack) |
| Language | TypeScript 5.1+ |
| Styling / UI | Tailwind CSS, **shadcn/ui** |
| Auth | **WorkOS** AuthKit — [example repo](https://github.com/workos/next-authkit-example/tree/main) |
| Data | **Convex** |
| Async / queues | **TBD** — evaluate [Vercel Queues](https://vercel.com/docs/queues) vs alternatives before locking (see `docs/IMPLEMENTATION.md` §9) |
| Lint / format | **Biome** |
| API clients | **OpenAPI Generator** (optional; `generate:api`) |
| Git hooks | Optional (e.g. Husky); **CI** enforces quality |
| Tests | Vitest + colocated **`*.spec.ts[x]`**; Playwright in `tests/e2e/`; **integration tests in Docker** |
| Containers | **Docker** + **Docker Compose** (required) |
| Deploy | **Vercel** |
| CI | **GitHub Actions** |

**Dashboard layout inspiration:** [next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) (example only).

---

## Required pages (minimum)

### Public (no auth) — SEO & trust

| Route (examples) | Purpose |
|------------------|---------|
| `/` | Landing |
| `/about` | Company / product |
| `/contact` | Contact / leads |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/pricing` | Plans (or contact-sales CTA) |
| Auth + **WorkOS callbacks** | As required by AuthKit |

### Private (authenticated)

| Route (examples) | Purpose |
|------------------|---------|
| `/dashboard` or `/app` | Authenticated home + primary CRUD |
| `/profile` or `/settings` | User’s own account |
| `/team` / workspace routes | **Manager**: manage assigned team(s) |
| `/work` / assigned work | **Team member**: own work items |
| `/admin/...` | **Super admin** only |

**Roles:** **Super admin** (global), **Manager** (team scope), **Team member** (self + assigned work); a user **can have multiple roles**. See **`docs/IMPLEMENTATION.md` §4**.

---

## Environment files

| File | In git? | Purpose |
|------|---------|---------|
| **`.env`** | **Yes** | Non-secret defaults and public config only |
| **`.secret.example`** | **Yes** | Template: secret *names* with placeholders |
| **`.secret`** | **No** (gitignored) | Real secrets locally; use Vercel/GitHub secrets in deploy/CI |

Details: **`docs/SPECIFICATION.md`** (Configuration) and **`docs/IMPLEMENTATION.md` §2.2**.

---

## Prerequisites

- [Next.js system requirements](https://nextjs.org/docs/app/getting-started/installation#system-requirements) (Node **≥ 20.9**, TS **≥ 5.1**)
- **Git**, **pnpm** or **npm**
- **Docker Desktop** (or Docker Engine + Compose) — **required** for compose-based local run and integration tests
- **WorkOS** account when wiring auth

---

## Repository layout

```
.
├── .github/workflows/          # CI: typecheck, lint, test, Docker integration, E2E
├── app/                         # Next.js routes (public, auth, dashboard, admin)
├── components/
│   └── ui/                      # shadcn/ui
├── convex/                      # Schema, queries, mutations, actions
├── lib/
│   └── api/                     # Optional OpenAPI-generated client
├── tests/e2e/                   # Playwright (E2E). Vitest: colocate *.spec.ts[x] next to source files elsewhere
├── biome.json
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── middleware.ts                # WorkOS / session
├── next.config.ts
├── package.json
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
├── .env                         # committed non-secrets
├── .secret.example              # committed secret template
├── .gitignore                   # must ignore .secret
└── docs/
    ├── INTENT.md
    ├── SPECIFICATION.md
    └── IMPLEMENTATION.md
```

Vitest tests live as **`*.spec.ts`** / **`*.spec.tsx`** **beside** the module they test (not only under `tests/`).

---

## Scripts (expected)

| Script | Purpose |
|--------|---------|
| `dev` | **Docker Compose** local stack |
| `build` / `start` | Production |
| `lint` / `format` | Biome (run via Compose service command) |
| `typecheck` | `tsc` or equivalent (via Compose command) |
| `test` | Vitest (colocated `*.spec.*`) via **Docker Compose** |
| `test:integration` | Integration tests **via Docker Compose** |
| `test:e2e` | Playwright via **Docker Compose** |
| `generate:api` | OpenAPI client (if used) |

---

## Quick start

1. Clone / use template → `pnpm install`  
2. Copy **`.secret.example`** → **`.secret`** when you wire auth/backend; adjust **`.env`** (non-secret) as needed  
3. **Current milestone:** run **`pnpm dev`** and open [http://localhost:3000](http://localhost:3000). **Docker Compose** (`docker compose up --build`) is the canonical path once the Docker phase lands—see Linear / project roadmap.  
4. Read **`docs/IMPLEMENTATION.md` §1** for per-tool official links (Next.js, Convex, WorkOS, Biome, Docker, Vercel, Actions, OpenAPI, …)

---

## Documentation map

| Topic | Where |
|--------|--------|
| SEO & routing | `docs/IMPLEMENTATION.md` §3 |
| Roles | `docs/IMPLEMENTATION.md` §4 |
| Navigation & layout | `docs/IMPLEMENTATION.md` §5–6 |
| Design / theme | `docs/IMPLEMENTATION.md` §7 |
| Docker | `docs/IMPLEMENTATION.md` §8 · `docs/SPECIFICATION.md` |
| Queues evaluation | `docs/IMPLEMENTATION.md` §9 |
| OpenAPI | `docs/IMPLEMENTATION.md` §10 |
| Testing (colocated specs, Docker integration) | `docs/IMPLEMENTATION.md` §11 |
| **CI/CD** | `docs/IMPLEMENTATION.md` §12 |
| **Vercel deploy** | `docs/IMPLEMENTATION.md` §12.2 |

---

## Supplementary markdown (`wip/`)

Informal notes and deferred decisions—see **[wip/wip.md](wip/wip.md)**. Older research lives under **[wip/archive/](wip/archive/)** (not maintained).

---

## References

- [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js — Metadata & SEO](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Vercel — Docs](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker — Compose](https://docs.docker.com/compose/)
- [WorkOS AuthKit example](https://github.com/workos/next-authkit-example/tree/main)
- [Convex](https://docs.convex.dev/)
- [Biome](https://biomejs.dev/)
- [OpenAPI Generator](https://openapi-generator.tech/docs/installation)

---

## Notes

- **docs/INTENT.md** is goals-only; **docs/SPECIFICATION.md** is the stack and acceptance bar.  
- **Queues:** explore options before committing (see **`docs/IMPLEMENTATION.md` §9**).  
- **Lint:** run Biome in CI; Next.js 16+ does not lint inside `next build` by default.
