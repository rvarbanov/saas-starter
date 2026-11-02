# Research: Separate Convex deployment for CI e2e

**Ticket:** [RAD-205](https://linear.app/radi-dev/issue/RAD-205/research-separate-convex-deployment-for-ci-e2e)  
**Parent map:** [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff) (Stop unchecked deploys)  
**Related execution:** [RAD-184](https://linear.app/radi-dev/issue/RAD-184/ci-deploys-convex-to-the-live-backend-from-every-pr-run)  
**Question:** Charting locked a **separate CI Convex deployment** so PR runs never write live `incredible-dalmatian-315`. What is the concrete provisioning and wiring procedure? (No secret values in this write-up.)

---

## Verdict

**Provision a durable second Convex backend (prefer a second project’s production deployment), mint a CI-only deploy key, put that key in a distinct GitHub Actions secret, and point PR e2e at the CI URL via job env override — never via the production deploy key.**

| Concern | Procedure |
| --- | --- |
| Create CI target | New Convex project (e.g. `saas-starter-ci`) → use its **production** deployment; or same project + durable non-preview deployment via `npx convex deployment create` |
| Deploy keys | Production deploy key → **main-only** secret; CI deployment-scoped / CI-project prod key → **separate** secret used on `pull_request` |
| Convex env for AuthKit JWT | On the **CI deployment**: `WORKOS_CLIENT_ID` (required) + `WORKOS_API_KEY` if e2e hits WorkOS-backed actions; pair with WorkOS **local/test** env per charting |
| Next / GHA only | Cookie password, redirects, app URL, `E2E_*`, and `NEXT_PUBLIC_CONVEX_URL` override for the CI cloud URL |
| PR → CI URL | Set `NEXT_PUBLIC_CONVEX_URL` in the e2e job `env:` (GHA var/secret) so it wins over committed `.env` |
| Deploy + backfill | PR: `convex deploy --yes` + `convex:backfill-search-text` with **CI** key only. `main`: same steps with **prod** key only |
| Rejected | Convex **preview** deploy keys / per-branch previews (ephemeral, reseeding, concurrency/limits, beta) |

**Hard rule (charting):** production `CONVEX_DEPLOY_KEY` must not be referenced on `pull_request` jobs.

---

## 1. Current repo state (why this matters)

Today’s `e2e` job in `.github/workflows/ci.yml`:

1. Sets `CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}`.
2. Runs `pnpm exec convex deploy --yes` then `pnpm convex:backfill-search-text` when that secret is set.
3. Starts Playwright against `http://localhost:3000` while **not** overriding `NEXT_PUBLIC_CONVEX_URL`.

Committed `.env` sets `NEXT_PUBLIC_CONVEX_URL` to `https://incredible-dalmatian-315.convex.cloud`. So PR e2e both **deploys Convex code to** and **talks to** the same live backend the production app uses ([RAD-184](https://linear.app/radi-dev/issue/RAD-184/ci-deploys-convex-to-the-live-backend-from-every-pr-run)).

`convex/auth.config.ts` builds WorkOS JWT providers from **`WORKOS_CLIENT_ID` on the Convex deployment** (`process.env.WORKOS_CLIENT_ID` at deploy/push time). Cookie password and AuthKit redirects are Next-only.

Sources: `.github/workflows/ci.yml`; `.env` (URL host only); `convex/auth.config.ts`; [Convex & WorkOS AuthKit](https://docs.convex.dev/auth/authkit).

---

## 2. How to create the CI Convex deployment

Repo uses `convex` `^1.34.1`, which supports `npx convex deployment create` / deploy-key CLI ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments)).

### Recommended: second Convex **project**

Keeps deploy-key blast radius small: a production deploy key is scoped to **that project’s production deployment** ([Deploy Keys](https://docs.convex.dev/cli/deploy-key-types)).

1. In the Convex dashboard (same team as the live app), **Create project** — name e.g. `saas-starter-ci`.
2. Open that project’s **production** deployment settings; note the public URL (`https://<name>.convex.cloud`).
3. Generate a **production deploy key** for that deployment (dashboard → Deploy keys → enable at least `deployment:deploy` for CI push; include run/env permissions if CI will `convex run` / `convex env`).
4. From a logged-in machine (once), push this repo’s `convex/` to the CI project and set WorkOS env (section 4):
   - `CONVEX_DEPLOY_KEY=<ci-key> pnpm exec convex deploy --yes`
   - `CONVEX_DEPLOY_KEY=<ci-key> pnpm convex:backfill-search-text` (no-op if empty)
5. Sign in once with each e2e WorkOS persona against a Next app pointed at the CI URL so `users.store` provisions rows (or seed via internal mutation if you add one later).

Optional same-team CLI path: create the project interactively with `npx convex dev` choosing “create a new project,” then switch back to the live project for local work — do not leave developers’ `.env` / `.env.local` pointing at CI.

### Acceptable alternative: durable deployment in the **same** project

If you want one dashboard project:

```bash
npx convex deployment create ci --type=dev --region <region>
npx convex deployment token create ci-e2e --deployment ci
```

Use a **non-preview** type so the deployment does not auto-expire (previews expire in 5 or 14 days — [Multiple Deployments](https://docs.convex.dev/production/multiple-deployments)). Mint a **deployment-scoped** token so the key can only hit `ci`, not `incredible-dalmatian-315`.

Same-project is fine for isolation **only if** PR workflows never see the production key.

### Not recommended: second “prod” slot by renaming live deploy

Do not repoint the existing production deployment or rotate the live deploy key into CI. Isolation is a **second target** + **second secret**.

---

## 3. Deploy keys and GitHub Actions secret names

### Key types (Convex)

| Kind | Prefix shape (docs) | CLI behavior |
| --- | --- | --- |
| Production | `prod:<deployment>\|…` | `npx convex deploy` → that production deployment |
| Preview | `preview:<team>:<project>\|…` | `deploy` creates/reuses a **preview** named from the Git branch in GHA |
| Dev / deployment-scoped | `dev:<deployment>\|…` or mint via `deployment token create` | Commands bind to that one deployment |

Source: [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types), [`npx convex deploy`](https://docs.convex.dev/cli/reference/deploy).

### Recommended GitHub names

| Name | Store as | Used when | Points at |
| --- | --- | --- | --- |
| `CONVEX_DEPLOY_KEY` **or** rename to `CONVEX_DEPLOY_KEY_PROD` | Actions **secret** | `push` to `main` only | Live prod (`incredible-dalmatian-315`) |
| `CONVEX_DEPLOY_KEY_CI` | Actions **secret** | `pull_request` e2e (and optional `main` dry-run against CI — not required) | CI project/deployment |
| `NEXT_PUBLIC_CONVEX_URL_CI` | Actions **variable** (preferred) or secret | PR e2e job `env:` | Public CI cloud URL |

Keep the historical name `CONVEX_DEPLOY_KEY` for prod only if every `pull_request` step **stops referencing** `secrets.CONVEX_DEPLOY_KEY`. Renaming to `_PROD` makes the charting lock obvious in the YAML.

**Do not** put both keys in one secret or reuse one env var name across event types — that is the current footgun (`CONVEX_DEPLOY_KEY` on every e2e run).

Fork PRs: GitHub does not expose repo secrets to workflows from forks by default; treat that as defense-in-depth, not the primary control.

---

## 4. Env vars: Convex deployment vs Vercel / GitHub

Charting lock: **one WorkOS client ID per Convex deployment** — CI Convex ↔ WorkOS local/test; prod Convex ↔ WorkOS production. Verify by **environment name** in the WorkOS dashboard; never paste key material into tickets.

### Must live on the **CI Convex deployment**

Set with `npx convex env set` (or dashboard) while targeting the CI deploy key:

| Var | Why |
| --- | --- |
| `WORKOS_CLIENT_ID` | `convex/auth.config.ts` JWT issuer/JWKS/`applicationID` — without it AuthKit tokens fail Convex auth ([AuthKit docs](https://docs.convex.dev/auth/authkit)) |
| `WORKOS_API_KEY` | Needed for Node actions that call WorkOS User Management (e.g. email update / create-user paths in `convex/`). Use the **same WorkOS environment** as the client id |

Backend functions do **not** read frontend `.env` files ([Configuring Deployment URL](https://docs.convex.dev/client/react/deployment-urls)).

### Stay on Next / Vercel / GitHub only (not required on Convex)

| Var | Where |
| --- | --- |
| `WORKOS_COOKIE_PASSWORD` | Next AuthKit sealed session (CI job / `.secret` / Vercel) |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL` | Next + AuthKit redirect (CI already forces localhost callback) |
| `WORKOS_CLIENT_ID` (Next) | AuthKit Next SDK — **must match** the client id on the Convex deployment that Next talks to |
| `WORKOS_API_KEY` (Next) | AuthKit server boot + Playwright login completion (`requireWorkOsE2eEnv`) |
| `E2E_WORKOS_*` / role personas | GitHub Actions secrets only |
| `NEXT_PUBLIC_CONVEX_URL` | Next `ConvexReactClient` — CI job must override committed prod URL |

### Prod Convex / Vercel (unchanged conceptually)

Prod Convex keeps production WorkOS client id (+ API key for actions). Vercel production keeps production AuthKit secrets and `NEXT_PUBLIC_CONVEX_URL` for `incredible-dalmatian-315`.

---

## 5. Pointing PR e2e at the CI URL (without baking prod into CI)

Committed `.env` currently bakes the **prod** Convex URL into every checkout. Fix at **workflow env**, not by committing the CI URL into `.env` for everyone.

1. Store the CI cloud URL as `vars.NEXT_PUBLIC_CONVEX_URL_CI` (or secret of the same name).
2. On the **PR** e2e job, set:

   ```yaml
   env:
     NEXT_PUBLIC_CONVEX_URL: ${{ vars.NEXT_PUBLIC_CONVEX_URL_CI }}
     CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_CI }}
   ```

3. Rely on dotenv / Next behavior: values already present in `process.env` are not overwritten when Playwright loads `.env` (`playwright/env.ts` uses `loadEnv` without `override` for `.env`) and Next does not clobber existing env. The Playwright `webServer` inherits that env (`playwright/next-dev-server.mjs` passes `env: process.env`).

4. Optionally assert in the deploy step that the deploy key’s deployment name is **not** `incredible-dalmatian-315` (print `npx convex deployment` / dashboard URL from CLI status — no secret values).

`npx convex deploy --cmd … --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` only injects the URL for the `--cmd` subprocess ([deploy reference](https://docs.convex.dev/cli/reference/deploy)). This repo runs deploy, then a **separate** Playwright step — so the job-level `NEXT_PUBLIC_CONVEX_URL` override is the right lever.

---

## 6. When to run `convex deploy` + `convex:backfill-search-text`

`scripts/convex-backfill-search-text.mjs` runs `convex run users:backfillSearchText` using whatever `CONVEX_DEPLOY_KEY` (or login) is in the environment — same target as deploy.

| Event | Deploy key secret | Deploy + backfill | Next `NEXT_PUBLIC_CONVEX_URL` |
| --- | --- | --- | --- |
| `pull_request` | `CONVEX_DEPLOY_KEY_CI` only | Yes — keeps CI backend schema/functions aligned with the PR | CI URL override |
| `push` to `main` | `CONVEX_DEPLOY_KEY` / `_PROD` only | Yes — production stays aligned with `main` | Committed prod URL (or explicit prod var) |

Gate with explicit `if:` on steps or split jobs, e.g. prod deploy step:

`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`

PR deploy step:

`if: github.event_name == 'pull_request'`

**Production key must not appear in any `pull_request` step `env:`.** Unsetting is not enough if the YAML still references `secrets.CONVEX_DEPLOY_KEY` — remove that reference from PR paths.

Shared CI backend note: concurrent PRs all deploy to one CI deployment (last push wins). That matches a stable shared e2e backend; it is not isolation between PRs. Acceptable under the charting lock; call out for RAD-184 implementers.

---

## 7. Preview-deploy alternative — rejected (and why)

Convex preview deploy keys make `npx convex deploy` create/reuse a **preview** deployment (branch name in GitHub Actions) ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments), [deploy reference](https://docs.convex.dev/cli/reference/deploy)).

Rejected for this repo’s CI e2e:

1. **Ephemeral** — cleaned up after 5 days (14 on higher plans); e2e personas and `users` rows disappear.
2. **Reseed tax** — fresh backends need `--preview-run` or manual provisioning every create; this app’s e2e assumes durable WorkOS-linked users.
3. **Concurrency / limits** — every branch can mint a deployment toward team limits; parallel PRs multiply backends.
4. **Beta** — preview deployments are documented as beta.
5. **Secret footgun** — same `CONVEX_DEPLOY_KEY` name with a preview key still “works” in CI but changes CLI semantics; charting already locked a **stable separate** deployment + distinct secret.
6. **URL wiring** — PR Next would need the preview URL each run (`--cmd` injection or lookup); a fixed `NEXT_PUBLIC_CONVEX_URL_CI` is simpler for localhost Playwright.

---

## 8. Checklist for RAD-184 (execution; not done in this research)

Human / implementer steps (names only — no secret values):

1. Create CI Convex project (or durable `ci` deployment).
2. Set CI deployment env: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` (WorkOS local/test).
3. Mint CI deploy key → GitHub secret `CONVEX_DEPLOY_KEY_CI`.
4. Add GitHub variable `NEXT_PUBLIC_CONVEX_URL_CI`.
5. Restrict existing `CONVEX_DEPLOY_KEY` to `main` deploy/backfill only; remove from `pull_request`.
6. PR e2e: CI key + CI URL override; keep localhost AuthKit redirects and `E2E_*` as today.
7. Smoke: PR run deploys to CI host only; prod URL unchanged; e2e H2 search path green against CI.

---

## Sources

- Repo: `.github/workflows/ci.yml`, `convex/auth.config.ts`, `scripts/convex-backfill-search-text.mjs`, `playwright/env.ts`, `playwright/next-dev-server.mjs`, `.env` (public URL host), `docs/CONVEX_WORKOS_PRODUCTION_EPOCH.md`, RAD-203 charting locks.
- Convex: [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types), [Multiple Deployments](https://docs.convex.dev/production/multiple-deployments), [`npx convex deploy`](https://docs.convex.dev/cli/reference/deploy), [Project configuration](https://docs.convex.dev/production/project-configuration), [Configuring Deployment URL](https://docs.convex.dev/client/react/deployment-urls), [Convex & WorkOS AuthKit](https://docs.convex.dev/auth/authkit), [Vercel hosting / preview keys](https://docs.convex.dev/production/hosting/vercel).
- Linear: [RAD-205](https://linear.app/radi-dev/issue/RAD-205/research-separate-convex-deployment-for-ci-e2e), [RAD-184](https://linear.app/radi-dev/issue/RAD-184/ci-deploys-convex-to-the-live-backend-from-every-pr-run), [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff).

Convex MCP `status` / `envList` were unavailable in this environment (CLI not logged in); deployment identity for prod is taken from committed `NEXT_PUBLIC_CONVEX_URL` host `incredible-dalmatian-315` only.
