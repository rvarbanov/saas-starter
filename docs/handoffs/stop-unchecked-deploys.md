# Stop unchecked deploys

- **Map:** https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff
- **Packed:** 2026-11-01
- **Status:** packed
- **Source children:** RAD-204, RAD-205, RAD-206, RAD-207, RAD-208, RAD-209, RAD-210

After pack, **this file wins** over Linear map summaries and child issue bodies.

## Destination

A later execution pass closes every unchecked path to production named by this effort: PR CI must not write the live Convex backend; CI and production each trust the matching WorkOS environment; `main` requires a PR with green required checks and rejects force-push; Vercel production aliasing waits on those same GitHub checks; main CI runs are not cancelled by a newer push. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the **build/ops execution** — this packed file is decision-complete; the map itself does not flip live gates.

Execution backlog (implement against this file; do not re-grill):

- [CI deploys Convex to the live backend from every PR run](https://linear.app/radi-dev/issue/RAD-184)
- [Verify Convex WORKOS_CLIENT_ID matches both sign-in sources](https://linear.app/radi-dev/issue/RAD-190)
- [Protect main with a ruleset…](https://linear.app/radi-dev/issue/RAD-194)
- [Gate Vercel production deploys on GitHub CI checks](https://linear.app/radi-dev/issue/RAD-195)
- [Don't cancel in-progress CI runs on main](https://linear.app/radi-dev/issue/RAD-196)

## Out of scope

- Implementing or closing the five execution backlog tickets inside the Wayfinder map session (pack only; execution is later)
- Multi-provider `auth.config` on a single shared Convex deployment
- Forcing CI and production onto one WorkOS environment
- Native Vercel-only lint/typecheck Deployment Checks as a substitute for GitHub CI
- Convex **preview** deployments / preview deploy keys for PR e2e
- Same-project extra Convex deployment as the CI target (second **project** is locked)
- Merge queue for `main`
- GitHub ruleset **admin bypass** (charting: none)
- Product feature work unrelated to deploy safety
- Changing product `GLOSSARY.md` for infra vocabulary

## Decisions

### Charting lock — cancel-in-progress on main

In `.github/workflows/ci.yml`, `concurrency.cancel-in-progress` must be **true only for `pull_request`**:

```yaml
cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Main push runs always finish. No separate grilling ticket — pack and execute via [RAD-196](https://linear.app/radi-dev/issue/RAD-196).

### Charting lock — `main` ruleset shape

Prefer a **repository branch ruleset** (not classic branch protection). Target `main`:

| Rule | Setting |
| --- | --- |
| Pull request | Required |
| Required status checks | `quality`, `docker-integration`, `e2e` (exact Actions job / check-run names — **not** workflow label `CI`, not `CI / …` UI chrome) |
| Up to date | `strict_required_status_checks_policy: true` (or equivalent “require branches to be up to date”) |
| Force push | Blocked (`non_fast_forward`) |
| Deletion | Blocked |
| Bypass list | Empty |
| Merge queue | Not in this pack |

Detail: [`docs/research/github-main-ruleset-check-names.md`](../research/github-main-ruleset-check-names.md). Execute via [RAD-194](https://linear.app/radi-dev/issue/RAD-194).

### Research: Vercel Deployment Checks ↔ GitHub CI job names (RAD-204)

- Prerequisites: project linked to GitHub; **automatic production aliasing on**.
- Select Deployment Checks by Actions check-run names `quality`, `docker-integration`, `e2e`.
- Renaming a job requires re-selecting Deployment Checks (and ruleset contexts).
- No `repository_dispatch` notify action required for this repo’s `push`/`pull_request` workflow.

Detail: [`docs/research/vercel-deployment-checks-github-ci-job-names.md`](../research/vercel-deployment-checks-github-ci-job-names.md).

### Research: Separate Convex deployment for CI e2e (RAD-205)

- Durable second Convex backend; **preview** path rejected (ephemeral data, reseed tax, limits, beta).
- Preferred shape refined by RAD-208: **second Convex project** (see below).
- Recommended secret/var names and PR URL override pattern adopted by RAD-208.

Detail: [`docs/research/convex-ci-separate-deployment.md`](../research/convex-ci-separate-deployment.md).

### Research: GitHub main ruleset required-check names (RAD-206)

- `main` was unprotected at research time (no rulesets, no classic protection).
- Required check contexts are exactly the job ids: `quality`, `docker-integration`, `e2e`.

Detail: [`docs/research/github-main-ruleset-check-names.md`](../research/github-main-ruleset-check-names.md).

### Research: Map Convex WORKOS_CLIENT_ID to WorkOS environment names (RAD-207)

Report **environment names only** — never paste client IDs or API keys into tickets or commits.

| Surface (at research time) | WorkOS environment |
| --- | --- |
| Live Convex `incredible-dalmatian-315` JWT trust | **local** |
| CI e2e / committed `.env` AuthKit | **local** (aligned with Convex) |
| Vercel production AuthKit | **production** (**mismatch** with live Convex) |

**After the split:** CI Convex ↔ **local**; prod Convex ↔ **production**.

Detail: [`docs/research/convex-workos-client-id-environments.md`](../research/convex-workos-client-id-environments.md).

### CI dual-deploy-key and e2e Convex URL contract (RAD-208)

| Item | Contract |
| --- | --- |
| Prod deploy secret | Keep name `CONVEX_DEPLOY_KEY` — **main / prod only** |
| CI deploy secret | `CONVEX_DEPLOY_KEY_CI` — **`pull_request` only** |
| CI URL | Actions **variable** `NEXT_PUBLIC_CONVEX_URL_CI`; set as job `NEXT_PUBLIC_CONVEX_URL` on PR e2e so it wins over committed `.env` |
| CI backend | Second Convex **project** (e.g. `saas-starter-ci`) + that project’s production deploy key |
| PR concurrency | One shared CI backend; last push wins (document; not per-PR isolation) |
| Missing key/URL | **Hard-fail** the deploy/e2e path for that event (no soft-skip) |
| PR events | Deploy + `convex:backfill-search-text` with CI key only; e2e against CI URL |
| Main events | Deploy + backfill with prod key only; e2e against prod URL |
| Hard rule | `secrets.CONVEX_DEPLOY_KEY` must **not** be referenced on any `pull_request` step |

**Pack vs execution:** this contract is frozen here; [RAD-184](https://linear.app/radi-dev/issue/RAD-184) does human provisioning + the `.github/workflows/ci.yml` change.

### Vercel Deployment Checks selection and Force Promote stance (RAD-209)

- Require Deployment Checks: `quality`, `docker-integration`, `e2e`.
- Keep automatic production aliasing **on**.
- **Green enough to promote:** GitHub success set for required checks — `success` / `skipped` / `neutral`. **`cancelled` and `failure` do not** clear the gate.
- **Force Promote:** documented emergency bypass on the deployment details page — name it in handoff + README so it is not a silent hole. No product switch to disable.
- Docs for [RAD-195](https://linear.app/radi-dev/issue/RAD-195): authoritative detail here; short README pointer (settings path, check names, Force Promote).

### Handoff execution order for stop-unchecked-deploys (RAD-210)

Canonical order after pack:

1. [RAD-196](https://linear.app/radi-dev/issue/RAD-196) — cancel-in-progress only on PRs  
2. [RAD-184](https://linear.app/radi-dev/issue/RAD-184) — provision `saas-starter-ci` + dual-key `ci.yml`; CI Convex ↔ WorkOS **local**  
3. [RAD-190](https://linear.app/radi-dev/issue/RAD-190) — prod Convex ↔ WorkOS **production**; verify CI ↔ **local**  
4. [RAD-194](https://linear.app/radi-dev/issue/RAD-194) ∥ [RAD-195](https://linear.app/radi-dev/issue/RAD-195) — ruleset and Vercel Deployment Checks (parallel OK)

**Do not:** flip live Convex to WorkOS **production** before the CI split (breaks shared-backend CI e2e).  
**Do not:** enable 194/195 before CI secrets + hard-fail path exist (merge/promote deadlock).

**Safe interim:**

| Done so far | State |
| --- | --- |
| 196 alone | Safer for later gates; prod still unchecked |
| 184 before 190/gates | PRs stop writing live Convex; AuthKit/Convex mismatch may remain until 190 |
| 190 before gates | Pairings correct; merges/deploys still unchecked until 194/195 |

## Build checklist

Execute in RAD-210 order. Prefer one PR per backlog ticket unless a human explicitly batches.

1. **RAD-196 — cancel-on-main**  
   - Edit `.github/workflows/ci.yml`: set `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.  
   - Open/merge PR; confirm two quick pushes to `main` both complete.

2. **RAD-184 — provision CI Convex (human)**  
   - Create Convex project `saas-starter-ci` (or equivalent name).  
   - Set CI deployment env: `WORKOS_CLIENT_ID` + `WORKOS_API_KEY` for WorkOS **local** (names only in comments/docs).  
   - Mint CI production deploy key → GitHub secret `CONVEX_DEPLOY_KEY_CI`.  
   - Add GitHub Actions variable `NEXT_PUBLIC_CONVEX_URL_CI` (CI cloud URL).  
   - Seed/provision e2e personas against the CI backend as needed.

3. **RAD-184 — dual-key `ci.yml`**  
   - PR path: `CONVEX_DEPLOY_KEY_CI` + `NEXT_PUBLIC_CONVEX_URL` from `vars.NEXT_PUBLIC_CONVEX_URL_CI`; deploy + backfill; hard-fail if key/URL missing.  
   - Main path: `CONVEX_DEPLOY_KEY` only; deploy + backfill; hard-fail if missing.  
   - Remove every `pull_request` reference to `secrets.CONVEX_DEPLOY_KEY`.  
   - Confirm a PR run deploys only to the CI host (not `incredible-dalmatian-315`).

4. **RAD-190 — WorkOS pairing**  
   - After CI split: set/verify prod Convex `WORKOS_CLIENT_ID` to WorkOS **production**; verify CI Convex remains **local**.  
   - Confirm production sign-in end-to-end against Convex; confirm CI e2e AuthKit against CI Convex.  
   - Never paste secret values into Linear or git.

5. **RAD-194 — ruleset**  
   - Create repo ruleset for `main` per Decisions (PR required; checks `quality`, `docker-integration`, `e2e`; up to date; no force-push/deletion; empty bypass).

6. **RAD-195 — Vercel Deployment Checks**  
   - Settings → Build and Deployment → Deployment Checks: add GitHub checks `quality`, `docker-integration`, `e2e`.  
   - Confirm automatic production aliasing remains on.  
   - Document Force Promote + settings pointer in README (short); keep this handoff authoritative.

7. **Quality bar after each code PR**  
   - `pnpm typecheck`, `pnpm lint`, `pnpm test`, and existing Playwright e2e green for the dual-key CI path.

## Acceptance criteria

- [ ] Ops: A PR CI run cannot change live Convex (`incredible-dalmatian-315` / production deploy target).
- [ ] Ops: PR e2e runs against the CI Convex deployment URL and passes with `CONVEX_DEPLOY_KEY_CI` + `NEXT_PUBLIC_CONVEX_URL_CI` present (hard-fail if missing).
- [ ] Ops: Pushes to `main` still deploy Convex to production with `CONVEX_DEPLOY_KEY` only.
- [ ] Ops: Prod Convex trusts WorkOS **production**; CI Convex trusts WorkOS **local** (environment names only).
- [ ] Ops: Direct push / force-push to `main` rejected; PR with failing/missing required check cannot merge; branch behind `main` must update before merge.
- [ ] Ops: A `main` commit with failing or cancelled required CI does not become the production alias; a fully green commit does (Force Promote remains a documented emergency bypass only).
- [ ] Ops: Two quick pushes to `main` produce two completed CI runs; a new PR push still cancels the older PR run.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] E2E: existing Playwright suite remains the coverage for this effort — **no new product-route specs** invented here; after dual-key CI, PR `e2e` job must pass against CI Convex (including Users search H2 when deploy+backfill succeeded). Soft-skip of Convex deploy on missing CI secrets is **forbidden**.

## Open / deferred

- [Order Convex and Vercel releases…](https://linear.app/radi-dev/issue/RAD-199) — Convex-before-Vercel release ordering. **Do not invent** ordering beyond RAD-210 in this pack; graduate in a later map if still needed after gates land.
- [Investigate non-git production deploy…](https://linear.app/radi-dev/issue/RAD-185) — CLI/API prod promote bypass. **Do not invent** token/role restrictions here.
- Merge queue for `main` — **do not invent**; charting excluded it.
- Whether PR e2e should eventually target a Vercel preview URL instead of localhost — **do not invent**; stay on localhost Playwright + CI Convex URL override.
- GitHub ruleset admin bypass — **do not invent**; empty bypass list stands.
- Force Promote cannot be disabled in-product per research — policy/docs only (RAD-209); further restriction is future fog.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff
- Children: [RAD-204](https://linear.app/radi-dev/issue/RAD-204), [RAD-205](https://linear.app/radi-dev/issue/RAD-205), [RAD-206](https://linear.app/radi-dev/issue/RAD-206), [RAD-207](https://linear.app/radi-dev/issue/RAD-207), [RAD-208](https://linear.app/radi-dev/issue/RAD-208), [RAD-209](https://linear.app/radi-dev/issue/RAD-209), [RAD-210](https://linear.app/radi-dev/issue/RAD-210), [RAD-211](https://linear.app/radi-dev/issue/RAD-211)
- Research notes: `docs/research/github-main-ruleset-check-names.md`, `docs/research/vercel-deployment-checks-github-ci-job-names.md`, `docs/research/convex-ci-separate-deployment.md`, `docs/research/convex-workos-client-id-environments.md`
- Contract: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
