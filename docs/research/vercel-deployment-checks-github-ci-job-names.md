# Research: Vercel Deployment Checks ↔ GitHub CI job names

**Ticket:** [RAD-204](https://linear.app/radi-dev/issue/RAD-204/research-vercel-deployment-checks-github-ci-job-names)  
**Parent map:** [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff) (Wayfinder: Stop unchecked deploys handoff)  
**Related execution:** [RAD-195](https://linear.app/radi-dev/issue/RAD-195/gate-vercel-production-deploys-on-github-ci-checks)  
**Question:** For Vercel project `saas-starter` gating production on GitHub Actions from `.github/workflows/ci.yml`, what exact facts does a later decision need (prerequisites, selectable check names, cancelled/skipped/pending/failed behavior with `concurrency.cancel-in-progress`, Force Promote, rename impact)?

---

## Verdict

Gate production by selecting the **GitHub Actions job check-run names** `quality`, `docker-integration`, and `e2e` — not the workflow display name `CI`. Prerequisites are a GitHub-linked project plus **automatic production aliasing on**. Keep aliasing on: Deployment Checks hold domain assignment until those checks pass; **Force Promote** is the documented bypass. Renaming a job changes the check identity, so Deployment Checks must be re-selected. With the current workflow’s `concurrency.cancel-in-progress: true` on `main`, a superseded run reports job conclusions of `cancelled` (sometimes mixed with earlier `success`); `cancelled` is **not** a successful GitHub required-check conclusion, and Vercel states GitHub-backed Deployment Checks match GitHub’s status edge cases — so a cancelled required job does not clear the gate for that commit.

This note does **not** flip Vercel or CI settings.

---

## 1. Prerequisites (Git linked + automatic production aliasing)

Vercel’s Deployment Checks docs list two prerequisites before adding GitHub Checks:

1. **Link the project to a GitHub repository** via Vercel for GitHub (verify under the project’s Git settings).
2. In the project’s **production environment** settings, ensure **automatic aliasing for production is turned on**.

Then: project **Deployment Checks** → **Add Checks** → provider **GitHub** → search/select the Actions checks to require.

What the feature does once configured:

- Production deployments are **still created**.
- They are **not** automatically assigned to custom production domains until all selected Deployment Checks are met.
- When checks pass, the deployment is aliased to production domain(s) automatically.

Changelog (2025-10-09): “block a deployment from being promoted to production until selected GitHub Actions complete successfully”; available for projects connected to GitHub.

First-party skill note (Vercel plugin): keep auto-assignment of production domains on; the checks decide *when* aliasing happens. Settings path: **Settings → Build and Deployment → Deployment Checks**.

Sources:

- [Deployment Checks — Adding GitHub Checks](https://vercel.com/docs/deployment-checks)
- [Changelog: Block Vercel deployment promotions with GitHub Actions](https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions)
- [vercel-plugin `deployment-checks.md`](https://github.com/vercel/vercel-plugin/blob/main/skills/deployments-cicd/references/deployment-checks.md)

**Project observation (no secrets):** Vercel project `saas-starter` (`prj_mUXS5vHnE7UmRU5XaTyPnR4BkhCm`) exists on the team and has production-target deployments / production domains. This research did not change Deployment Checks or aliasing toggles.

---

## 2. How GitHub Actions jobs appear as selectable Deployment Checks

### What Vercel selects

Vercel imports **commit statuses and GitHub Actions check-run results**. For ordinary `push` / `pull_request` workflows (this repo), docs say you can **depend on the check directly**; the `vercel/repository-dispatch/actions/status@v1` notify step is only **required** when the workflow is driven by `repository_dispatch`.

Vercel’s GitHub Checks limitations section states explicitly:

> GitHub uses the **names of jobs** to identify which checks are the same across instances.

Consequences called out there:

- **Changing the name of a job** requires updating Deployment Checks to match.
- Avoid the **same job name across multiple workflows** (Check Run collisions / races with branch protection, rulesets, and Deployment Checks).

Sources: [Deployment Checks — GitHub Checks / Limitations](https://vercel.com/docs/deployment-checks)

### What GitHub names the check run

- Workflow-level `name:` is the **workflow** label in the Actions UI (here: `CI`). It is **not** the check-run name used for required checks.
- `jobs.<job_id>.name` sets the displayed job name. If omitted, the check run uses the **job id**.

Source: [Workflow syntax — `jobs.<job_id>.name`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idname)

### This repo’s `.github/workflows/ci.yml`

| YAML field | Value |
| --- | --- |
| Workflow `name` | `CI` |
| Triggers | `push` to `main`; `pull_request` |
| Concurrency | `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` |
| Jobs (ids; **no** per-job `name:`) | `quality`, `docker-integration` (`needs: quality`), `e2e` (`needs: quality`) |

**Live check runs on `main` (GitHub Checks API):** for the latest successful `CI` push, GitHub Actions reported check-run **`name`** values exactly:

- `quality`
- `docker-integration`
- `e2e`

Workflow run object `name` is `CI`; that string is **not** what appears as the selectable check-run names above.

So for Vercel Deployment Checks (and for GitHub rulesets), the strings to select are **`quality`**, **`docker-integration`**, and **`e2e`**.

Sources: `.github/workflows/ci.yml`; `GET /repos/.../commits/main/check-runs` (observed 2026-11-01).

---

## 3. Behaviour when a required check is cancelled, skipped, pending, or failed

### What “pass” means for GitHub-required checks

GitHub documents successful conclusions for required status checks as: **`success`**, **`skipped`**, and **`neutral`**.  
`cancelled` / `failure` / timeouts / etc. are **not** in that success set.

Skipped-job nuance (important with `needs:`):

| Situation | GitHub behaviour |
| --- | --- |
| Job skipped by a **job-level** `if` conditional | Reports as success; does **not** block merge even if required |
| Workflow skipped (path/branch filters or `[skip ci]`-style commit message) | Associated checks stay **Pending** and **block** |
| Job `needs` a **failed** job | Dependent job is **skipped** and **may not** block; GitHub recommends `if: always()` (+ `needs`) for required dependents |

Sources:

- [Troubleshooting required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [Status checks — conclusions](https://docs.github.com/en/pull-requests/reference/status-checks)
- [Skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)

### How Vercel maps this for GitHub-backed Deployment Checks

Official Deployment Checks docs:

- Hold production domain assignment until required checks **pass**.
- “GitHub and GitHub Actions have edge cases with status reporting. **These behaviors are matched** in GitHub-backed Deployment Checks.”

So for this ticket’s intended path (select existing Actions check runs from `ci.yml`, not a custom `repository_dispatch` status), treat GitHub’s pass/fail/pending semantics as what Vercel mirrors.

Related (Checks API / integration checks — spelling `canceled`): for **blocking** checks, conclusions `canceled` and `failed` fail the deployment; `neutral`, `succeeded`, and `skipped` do not. That table is the Checks API anatomy page; it is consistent with treating **cancelled/canceled** as non-passing for a blocking gate, but the binding statement for **GitHub Actions** Deployment Checks remains the “matched to GitHub” sentence above.

Sources:

- [Deployment Checks](https://vercel.com/docs/deployment-checks)
- [Anatomy of the Checks API — Status and conclusion](https://vercel.com/docs/checks/creating-checks)

### Pending

While a selected check has not completed successfully, the production deployment remains created but **not** auto-aliased. Pending / in-progress / never-reported checks therefore **hold** promotion (same practical effect as GitHub “Waiting for status to be reported”).

### Failed

A `failure` conclusion on a selected job does **not** meet the gate; production domains stay unassigned until a successful conclusion (or Force Promote).

### Cancelled + `concurrency.cancel-in-progress` on `main`

This workflow cancels in-progress runs in the same concurrency group when a new run for that ref starts. GitHub: with `cancel-in-progress: true`, a new push to `main` cancels the previous in-progress workflow run for that group.

Cancelled workflow/job conclusions are `cancelled` (GitHub spelling).

**Repo observations on cancelled `push` runs to `main`:**

| Run | Job conclusions |
| --- | --- |
| `37364501969` | `quality`, `docker-integration`, `e2e` all `cancelled` |
| `37566452603` | `quality` + `docker-integration` `success`; `e2e` `cancelled` |

So cancel-in-progress can leave a commit with **mixed** check conclusions: earlier jobs may already be green while a still-running job becomes `cancelled`. If all three job names are required Deployment Checks, **any** `cancelled` required job means that commit does not clear the gate.

Implication for RAD-196 / the map’s pre-settled cancel policy: leaving `cancel-in-progress: true` on `main` can mark the superseded commit’s CI as cancelled (non-passing) while the newer commit gets a new Vercel production deployment waiting on **its** checks. The cancelled commit does not get a clean “all green” signal for promotion.

Sources:

- [Control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- `.github/workflows/ci.yml`
- Observed cancelled Actions runs/jobs via GitHub API

### Skipped dependents in *this* workflow

`docker-integration` and `e2e` use `needs: quality` with no `if: always()`. If `quality` **fails**, GitHub skips the dependents (success-as-skipped per docs). Requiring **`quality`** as a Deployment Check is what blocks that failure path; requiring only `e2e` / `docker-integration` would be unsafe if `quality` failed and dependents were skipped.

---

## 4. What Force Promote does relative to Deployment Checks

Official docs, dedicated section **Bypassing Deployment Checks**:

> You can bypass Deployment Checks by selecting **Force Promote** from the deployment details page.

First-party Vercel skill text: “**Force Promote** on the deployment page bypasses the checks.”

This is distinct from ordinary “Promote” / staged-production flows that apply when auto-assign of production domains is **off**. Deployment Checks are designed to work **with** automatic aliasing left **on**; Force Promote is the explicit override when checks have not cleared.

Sources:

- [Deployment Checks — Bypassing](https://vercel.com/docs/deployment-checks)
- [vercel-plugin `deployment-checks.md`](https://github.com/vercel/vercel-plugin/blob/main/skills/deployments-cicd/references/deployment-checks.md)
- [Promoting Deployments](https://vercel.com/docs/deployments/promoting-a-deployment) (auto-assign off / Promote staged production — different control plane)

---

## 5. Must checks be re-selected if job names change?

**Yes.** Vercel docs: GitHub identifies checks by **job names**; “Changing the name of a job requires updating your Deployment Checks to align with the names.”

That covers:

- Adding `jobs.<job_id>.name` when none existed (check string changes from job id → display name).
- Renaming `jobs.<job_id>.name` or renaming the job id when that id was the check name.
- Introducing a duplicate job name in another workflow (collision risk called out by Vercel).

For `repository_dispatch` + status action workflows, the skill note also says renaming workflow/job renames the reported status, so the check must be selected again — same operational rule, different reporting path. This repo’s `ci.yml` does not use that path today.

Sources: [Deployment Checks — Limitations / GitHub Checks](https://vercel.com/docs/deployment-checks)

---

## 6. Decision-ready checklist (no settings flipped)

| Fact | Value for `saas-starter` |
| --- | --- |
| Prerequisites | GitHub linked; automatic production aliasing **on** |
| Selectable check strings | `quality`, `docker-integration`, `e2e` (not workflow name `CI`) |
| Notify action needed? | No — workflow is `push`/`pull_request`, not `repository_dispatch` |
| Pass conclusions (GitHub; mirrored per Vercel) | `success`, `skipped`, `neutral` |
| Non-pass for gate | `cancelled`, `failure`, pending/never reported, etc. |
| Force Promote | Bypasses Deployment Checks from deployment details |
| Rename job | Re-select Deployment Checks |
| `cancel-in-progress` on `main` | Can leave required jobs `cancelled` (sometimes after others already `success`) on the superseded commit |

---

## Sources (primary)

1. [Vercel — Deployment Checks](https://vercel.com/docs/deployment-checks)  
2. [Vercel changelog — Block promotions with GitHub Actions](https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions)  
3. [Vercel — Anatomy of the Checks API](https://vercel.com/docs/checks/creating-checks)  
4. [Vercel — Promoting Deployments](https://vercel.com/docs/deployments/promoting-a-deployment)  
5. [vercel-plugin skill — deployment-checks.md](https://github.com/vercel/vercel-plugin/blob/main/skills/deployments-cicd/references/deployment-checks.md)  
6. [GitHub — Status checks](https://docs.github.com/en/pull-requests/reference/status-checks)  
7. [GitHub — Troubleshooting required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)  
8. [GitHub — Workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)  
9. [GitHub — Workflow syntax `jobs.<job_id>.name`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idname)  
10. Repo: `.github/workflows/ci.yml` + live check-run names / cancelled-run job conclusions on `rvarbanov/saas-starter`
