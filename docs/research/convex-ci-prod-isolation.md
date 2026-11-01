# Research: Convex CI / PR isolation from production

**Question:** How do Convex projects officially isolate non-prod CI/PR backends from production? What should saas-starter prefer for durable Playwright e2e that must not touch prod?

**Sources:** docs.convex.dev, news.convex.dev, get-convex GitHub (`convex-js` CLI). No secret values.

**Date:** 2026-11-01

---

## Verdict

For **durable CI e2e that must not touch prod**, prefer **(A) second project production deployment**.

Evidence:

- Permanent staging is explicitly documented as a **separate Convex project** whose deploy key you set as `CONVEX_DEPLOY_KEY` for `npx convex deploy` — not previews, and not “reuse the prod project’s default deployment.” ([Deploying Your App to Production](https://docs.convex.dev/production/overview))
- Per-PR backends are a different path: **preview deploy keys** create ephemeral preview deployments (auto-expire 5d / 14d), leaving prod/dev unaffected; seed with `--preview-run`. ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments), [Vercel hosting](https://docs.convex.dev/production/hosting/vercel))
- Hosting guides require **separate keys by environment**: production deploy key → Production only; preview deploy key → Preview / Deploy Previews only. Same build command, different `CONVEX_DEPLOY_KEY`. ([Vercel](https://docs.convex.dev/production/hosting/vercel), [Netlify](https://docs.convex.dev/production/hosting/netlify))
- Deploy keys are typed and scoped (`prod:…`, `preview:team:project|…`, deployment-scoped tokens via `npx convex deployment token create`). A CI job should hold a key that can only act on the intended deployment/project. ([Deploy Keys](https://docs.convex.dev/cli/deploy-key-types), [Multiple Deployments — scoping](https://docs.convex.dev/production/multiple-deployments))
- CLI hard-stops accidental prod deploys from non-prod build envs when a **prod** deploy key is present (`--check-build-environment` default `enable`). ([convex-js `deploy.ts`](https://github.com/get-convex/convex-js/blob/main/src/cli/deploy.ts))

**Note on (B):** Same-project durable non-preview deployments (`npx convex deployment create staging --type prod`) are now documented as an advanced staging option ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments), [CLI reference](https://docs.convex.dev/cli/reference/deployment)). They can isolate with a **deployment-scoped** key, but the production overview’s permanent-staging recommendation remains a **second project**. Prefer A for clear blast-radius and key hygiene.

---

## 1. What Convex officially recommends for non-prod CI backends

| Need | Official mechanism | Key type |
| --- | --- | --- |
| Per-branch / PR preview (frontend + backend) | Preview deployments via `npx convex deploy` | `preview:team-slug:project-slug\|…` |
| Permanent staging / durable shared non-prod | **Separate Convex project** (prod deployment of that project) | That project’s **production** deploy key |
| Advanced same-project extra backends (staging, agents, shards) | `npx convex deployment create` (e.g. `staging --type prod`) | Deployment-scoped deploy key (`deployment token create`) |
| Ephemeral per-CI-run / agent worktree | `deployment create … --type=dev --expiration "in 7 days"` | Then mint a key for that deployment |

**Not recommended for durable CI:** relying on the **live product project’s production deployment**, or putting that project’s **prod** deploy key in PR/preview CI.

### Preview path (official default for PRs)

From [Working with Multiple Deployments](https://docs.convex.dev/production/multiple-deployments):

- Set `CONVEX_DEPLOY_KEY` to a **preview deploy key**.
- `npx convex deploy` creates/reuses a preview named after the Git branch (Vercel, Netlify, Cloudflare Pages, GitHub) or `--preview-name` / `--preview-create`.
- Previews auto-clean up after **5 days** (Free/Starter) or **14 days** (Pro/Business/Enterprise).
- Optional seed: `--preview-run=<functionName>` (runs when a preview is created; ignored for production deploys).
- Same deploy command for preview vs production: **different key per environment**.

Vercel/Netlify guides state previews create a **fresh** Convex backend and leave production and development unaffected. ([Vercel](https://docs.convex.dev/production/hosting/vercel), [Netlify](https://docs.convex.dev/production/hosting/netlify))

### Permanent staging path (official for durable non-prod)

From [Deploying Your App to Production](https://docs.convex.dev/production/overview):

> With Convex preview deployments your team can test out changes before deploying them to production. **If you need a more permanent staging environment, you can use a separate Convex project**, and deploy to it by setting the `CONVEX_DEPLOY_KEY` environment variable when running `npx convex deploy`.

Also: you can run the same codebase on multiple prod deployments belonging to **different projects** (staging section).

### Same-project extra deployments (newer / advanced)

[Multiple Deployments](https://docs.convex.dev/production/multiple-deployments) lists “Add a staging environment for your project” among reasons to create more cloud deployments, and documents:

```bash
npx convex deployment create staging --type=prod
```

([CLI reference](https://docs.convex.dev/cli/reference/deployment))

This is a valid durable non-preview deployment **inside** the same project, but it is not what the production overview names as the permanent-staging recipe.

---

## 2. Tradeoffs: durable shared CI backend vs per-PR previews

Context: saas-starter Playwright e2e with **seeded WorkOS users** (identity lives in WorkOS; Convex holds app data / JWT trust via `WORKOS_CLIENT_ID`).

### Durable shared CI backend (all PRs → one Convex)

**Fits official “permanent staging” shape** (prefer second project).

| Pros | Cons |
| --- | --- |
| Stable `NEXT_PUBLIC_CONVEX_URL` / deploy target for CI | Concurrent PRs share data and function versions — one deploy can break others’ e2e |
| No 5/14-day expiration | Schema/function pushes from PR CI are shared blast radius |
| Seeded Convex state can persist alongside long-lived WorkOS test users | Does **not** isolate branch-specific backend changes the way previews do |
| Deployment-scoped or separate-project prod key never authorizes real prod | If CI deploys PR code to the shared backend, “main-shaped” e2e assumptions drift |

**Implication for WorkOS-seeded e2e:** durable backend pairs well with durable sandbox WorkOS users/env; re-seeding Convex is optional/periodic rather than every PR. Isolation from **prod** is via project/key separation, not via preview ephemerality.

### Per-PR preview deployments

**Official PR preview path.**

| Pros | Cons |
| --- | --- |
| Isolated functions, data, crons, config per branch | Auto-expire; long-lived PRs need recreate |
| Prod/dev untouched by design | Fresh backends → must `--preview-run` (or import) seed every new preview |
| Hosting guides wire frontend preview ↔ Convex preview together | Preview deploy key is **project-scoped** (creates previews in that project), not a single durable URL |
| `--preview-create` can force clean slate | Parallel preview count hits team deployment limits |

**Implication for WorkOS-seeded e2e:** WorkOS users can stay in a shared sandbox env, but **Convex-side** rows / auth config must be re-established per preview. Previews are a poor fit if CI assumes one durable Convex URL and long-lived seeded DB state without a seed step.

### Summary for saas-starter

- Need **must not touch prod** + **durable seeded e2e** → durable non-prod backend (**A**, second project).
- Need **test this PR’s Convex functions in isolation** → preview deploy keys / per-PR previews.
- Those goals conflict if one shared CI backend also receives every PR’s `convex deploy`.

---

## 3. Official guidance on deploy key scoping / never using prod key on PRs

### Key types ([Deploy Keys](https://docs.convex.dev/cli/deploy-key-types))

- **Production deploy key** (`prod:deploymentName|…`): targets that production deployment; for build pipelines that should push **production**.
- **Preview deploy key** (`preview:team-slug:project-slug|…`): changes `npx convex deploy` to create/update **preview** deployments.
- **Deployment-scoped token** (`npx convex deployment token create`): “hand a single deployment off to a coding agent or CI job”; subsequent CLI commands run against that deployment only. ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments))
- Permissions: for CI deploy, enable `deployment:deploy` (and only what else is required).

### Environment separation (hosting guides)

**Vercel** ([docs](https://docs.convex.dev/production/hosting/vercel)):

1. Production: generate **Production Deploy Key** → `CONVEX_DEPLOY_KEY` with Environment = **Production only** (uncheck Preview).
2. Preview: generate **Preview Deploy Key** → separate `CONVEX_DEPLOY_KEY` with Environment = **Preview only**.

**Netlify** ([docs](https://docs.convex.dev/production/hosting/netlify)):

- Same variable name; **Different value for each deploy context** — production key for Production, preview key under Deploy Previews.

This is the clearest official “never give PR builds the prod key” pattern: **prod key must not be present in Preview/PR CI secrets**.

### CLI safety net ([convex-js `deploy.ts`](https://github.com/get-convex/convex-js/blob/main/src/cli/deploy.ts))

When `--check-build-environment` is `enable` (default), if the build environment is non-production **and** `CONVEX_DEPLOY_KEY` points at a **prod** deployment, deploy crashes with:

> Detected a non-production build environment and `CONVEX_DEPLOY_KEY` for a production Convex deployment. This is probably unintentional.

So: do not put the **real prod** key in PR/preview CI. For a **second-project** CI/staging backend, CI correctly uses that **other** project’s production deploy key (or a token scoped to that deployment)—not the product project’s prod key.

Related GitHub hardening: [`npx convex dev` refuses production deploy keys](https://github.com/get-convex/convex-backend/pull/388) unless an explicit escape hatch is used.

---

## Practical mapping for saas-starter

| Surface | Convex target | Key in that surface’s secrets |
| --- | --- | --- |
| Vercel / prod app | Product project **production** | Product **prod** deploy key only |
| GitHub Actions Playwright e2e (durable) | **CI/staging project** production (or named durable deployment) | That project/deployment’s key only — never product prod key |
| Optional Vercel Preview apps | Product project **preview** deployments | **Preview** deploy key only |

---

## Source index

| Claim | URL |
| --- | --- |
| Permanent staging = separate project | https://docs.convex.dev/production/overview |
| Preview deployments, expiration, preview keys, seed, same-project staging via `deployment create` | https://docs.convex.dev/production/multiple-deployments |
| Deploy key types and meanings | https://docs.convex.dev/cli/deploy-key-types |
| `deployment create` / `token create` CLI | https://docs.convex.dev/cli/reference/deployment |
| Vercel prod vs preview key environments | https://docs.convex.dev/production/hosting/vercel |
| Netlify prod vs preview key contexts | https://docs.convex.dev/production/hosting/netlify |
| `deploy` targeting + `--check-build-environment` | https://docs.convex.dev/cli/reference/deploy ; https://github.com/get-convex/convex-js/blob/main/src/cli/deploy.ts |
| Preview deployments announcement | https://news.convex.dev/announcing-convex-1-5/ |
| Enterprise/unlimited deployments (context) | https://news.convex.dev/enterprise-launch/ |
