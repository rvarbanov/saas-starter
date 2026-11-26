<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Wayfinder handoffs

When implementing a Wayfinder destination from a prior grilling map, read [`docs/handoffs/CONTRACT.md`](docs/handoffs/CONTRACT.md). Execute only from a **`packed`** handoff under `docs/handoffs/` (not from Linear summaries alone).

## Cursor Cloud specific instructions

Stack: single Next.js 16 app (`saas-starter`) + Convex backend + WorkOS AuthKit. Standard commands live in `package.json` scripts and the `Makefile`; the update script already runs `pnpm install`.

- **Node version (important):** the project targets Node 24.x (`.nvmrc` = `24.16.0`), but the cloud VM's default `node` (from `/exec-daemon`) is Node 22.x and wins `$PATH` in non-interactive Shell commands. The startup update script installs Node 24 via nvm. For your own commands, activate it first: `export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"` (or `source ~/.nvm/nvm.sh && nvm use`). Login/tmux shells (`bash -l`) pick this up automatically via `~/.bashrc`. Node 22 also runs most things, but use Node 24 to match CI.
- **Running the app needs `.env.local` + `.secret`:** Tracked `.env` holds universal defaults only. Copy `.env.local.example` → `.env.local` for local non-secrets (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONVEX_URL`, `WORKOS_CLIENT_ID`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`). Prod/Preview/CI get those names from Vercel / Actions. Next.js loads server secrets from `.secret` (see `next.config.ts`). WorkOS AuthKit refuses to boot without `WORKOS_COOKIE_PASSWORD` (≥32 chars). For local dev without real WorkOS keys, create `.secret` with placeholders (same approach as CI):
 ```
 WORKOS_API_KEY=sk_test_ci_placeholder
 WORKOS_COOKIE_PASSWORD="01234567890123456789012345678901"
 ```
 Then `pnpm dev:native` serves on http://localhost:3000. (`pnpm dev` / `make run-docker` uses Docker Compose instead — native is simpler here.)
- **Convex:** set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`, then run `npx convex dev` / `pnpm convex:dev` to sync `convex/` (needs Convex login or `CONVEX_DEPLOY_KEY`; won't work unattended without credentials).
- **Auth flow:** protected App routes (`/dashboard`, `/dashboard/users`, `/dashboard/coming-soon`, `/dashboard/settings`, `/dashboard/profile`) redirect unauthenticated users to the WorkOS hosted login (needs `WORKOS_CLIENT_ID` in `.env.local` / Vercel / CI vars). Completing sign-in needs a real WorkOS test account.
- **Playwright e2e secrets (required):** `E2E_WORKOS_EMAIL`, `E2E_WORKOS_PASSWORD`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`. Local: `.secret`. Cursor Cloud: environment runtime secrets (process env; no `.secret` file needed). GitHub Actions: repo-level e2e/WorkOS secrets in `.github/workflows/ci.yml`; Convex deploy keys live in Environments **`ci`** (e2e) and **`prod`** (`deploy-prod` on main only). `pnpm test:e2e` fail-fasts if any are missing. Use Playwright **Chromium** (not `channel: "chrome"`) so CI’s Playwright Docker image works without installing Google Chrome.
- **Quality checks** (match CI `quality` job): `pnpm typecheck`, `pnpm lint` (Biome), `pnpm format:check` (Biome format), `pnpm test` (Vitest). E2E: `pnpm exec playwright install chromium --with-deps` once locally, then `pnpm test:e2e` (it starts its own dev server; free port 3000 first).
