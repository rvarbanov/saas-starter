# Research: GitHub main ruleset required-check names

**Ticket:** [RAD-206](https://linear.app/radi-dev/issue/RAD-206/research-github-main-ruleset-required-check-names)  
**Parent map:** [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff) (Stop unchecked deploys)  
**Related execution:** [RAD-194](https://linear.app/radi-dev/issue/RAD-194/protect-main-with-a-ruleset-require-pr-required-ci-checks-up-to-date)  
**Question:** For `rvarbanov/saas-starter`, what exact ruleset configuration matches the charting lock (require PR; required checks `quality`, `docker-integration`, `e2e`; require up-to-date; block force-push/deletion)?

Read-only probe performed 2026-11-01 against live GitHub APIs + `.github/workflows/ci.yml`. **No rulesets or branch protection were created or modified.**

---

## Verdict

**Use a repository branch ruleset (not classic branch protection).** Required check **contexts** are exactly the Actions job IDs:

| Job in `ci.yml` | Required-check context to enter |
| --- | --- |
| `quality` | `quality` |
| `docker-integration` | `docker-integration` |
| `e2e` | `e2e` |

**`main` is currently unprotected** (`protected: false`, zero rulesets, no branch protection rule). Charting lock maps cleanly onto ruleset rule types `pull_request` + `required_status_checks` (with `strict_required_status_checks_policy: true`) + `non_fast_forward` + `deletion`, empty bypass list, no merge queue.

Do **not** require the legacy commit status `Vercel`, and do **not** prefix job names with the workflow title `CI / …` — those strings are UI chrome, not the check-run `name` GitHub matches.

---

## 1. Ruleset vs classic branch protection (this repo today)

| Signal | Result |
| --- | --- |
| Owner | User account `rvarbanov` (not an Organization) — [Users API](https://docs.github.com/en/rest/users/users) `type: User` |
| Repo rulesets | `GET /repos/rvarbanov/saas-starter/rulesets` → `[]`; GraphQL `rulesets.totalCount: 0` |
| Active rules on `main` | `GET /repos/.../rules/branches/main` → `[]` |
| Classic protection | GraphQL `ref.branchProtectionRule: null`; branch object `protected: false` |
| Classic protection REST | `GET .../branches/main/protection` → **403** (`administration=read` required by the integration token). Absence is still established by the signals above. |
| Org rulesets | `GET /orgs/rvarbanov/rulesets` → **404** (owner is not an org) |

**Recommendation for RAD-194:** create a **repository** branch ruleset under Settings → Rules → Rulesets (or `POST /repos/{owner}/{repo}/rulesets`). Prefer rulesets over classic branch protection because:

- Charting lock already specifies “ruleset” language and “no admin-bypass / no merge queue.”
- Rulesets layer, support Active/Disabled enforcement, and are viewable with read access ([About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)).
- Classic protection and rulesets can both apply (most restrictive wins); with nothing set today there is no conversion step.

Repo-level rulesets are available on this public user-owned repo (API list/create endpoints succeed for listing). Organization-wide rulesets are irrelevant here.

---

## 2. Exact check-run / status context names

### Workflow source

`.github/workflows/ci.yml`:

- Workflow `name: CI`
- Jobs (no `jobs.<id>.name` overrides): `quality`, `docker-integration`, `e2e`
- Triggers: `push` to `main`, and `pull_request` (eligible events for PR required checks)

### Live check-run names (GitHub Actions app)

Latest `main` commit `d7f984453edd98d7f93ecd25da7c8b281eb8f3ce` (workflow run `41095845907`):

| Check-run `name` | App | Conclusion |
| --- | --- | --- |
| `quality` | `github-actions` | success |
| `docker-integration` | `github-actions` | success |
| `e2e` | `github-actions` | success |

Same three names on PR run `41075293125` and on merged PR #74 `statusCheckRollup` (`name` + `workflowName: "CI"` as a separate field).

### Legacy commit statuses (not Actions jobs)

Same commit also has commit status context **`Vercel`** (deployment). That is a classic status context, not one of the three CI jobs. Charting lock does **not** include it.

### What to type in the ruleset picker / API `context`

Use the bare strings **`quality`**, **`docker-integration`**, **`e2e`**.

REST ruleset field: `rules[].parameters.required_status_checks[].context` ([Create a repository ruleset](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset)). Optional `integration_id` can pin the source to the GitHub Actions app (`15368` / slug `github-actions`); charting lock does not require pinning, but it reduces spoofing from arbitrary status writers ([Available rules for rulesets — Require status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)).

PR UI may display something like `CI / quality (pull_request)`; that decorated label is **not** the value to paste into required checks ([github/docs#33436](https://github.com/github/docs/issues/33436) discussion of UI vs configured name). Live APIs confirm the registered name is the job id alone.

---

## 3. Exact ruleset shape matching the charting lock

Charting lock (RAD-203): require PR; required checks `quality`, `docker-integration`, `e2e`; require up-to-date; block force-push and deletion; **no** merge queue; **no** admin-bypass policy in this pack.

Illustrative `POST /repos/rvarbanov/saas-starter/rulesets` body (do **not** apply from this research ticket):

```json
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "quality" },
          { "context": "docker-integration" },
          { "context": "e2e" }
        ]
      }
    },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
```

| Charting intent | Ruleset rule / setting |
| --- | --- |
| Require PR | `pull_request` with `required_approving_review_count: 0` (PR required; approvals not required by the lock) |
| Required checks | `required_status_checks` contexts above |
| Require up-to-date | `strict_required_status_checks_policy: true` (“Require branches to be up to date before merging”) — only takes effect when ≥1 check is listed |
| Block force-push | `non_fast_forward` (“Block force pushes”; enabled by default in UI) |
| Block deletion | `deletion` (“Restrict deletions”; selected by default in UI) |
| No merge queue | Omit merge-queue / do not enable queue on `main` |
| No admin bypass | Leave `bypass_actors` empty |

UI path: Settings → Rules → Rulesets → New branch ruleset → target `main` (or “Include default branch”) → enable the same protections ([Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)).

---

## 4. Gotchas

1. **Job rename / display `name`:** Required checks match the check-run `name`. Today that equals the YAML job id. Adding `jobs.quality.name: "Quality gate"` would change the registered check name to that display string — update the ruleset in the same change or merges stick on “Expected.” Renaming the workflow `name: CI` does **not** change these three contexts.

2. **First-time / stale checks:** GitHub indexes checks that have succeeded in the repo recently (docs: successful within the past seven days for required-check configuration). These three already run green on `main` and PRs, so the picker should autocomplete them. Brand-new job names need one successful run before they are easy to select ([Troubleshooting required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks)).

3. **Org vs repo rulesets:** Owner is a **User**, not an org — only **repository** rulesets apply. No parent org ruleset can weaken or supply these gates. If the repo is later transferred into an org, org rulesets layer additively (most restrictive wins); still keep the repo ruleset contexts in sync with job ids.

4. **No matrix / no reusable workflow:** Jobs are plain top-level jobs (not `uses:` reusable callers). Contexts are not `caller / job` paths. Required checks ignore event/matrix decoration ([Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules)).

5. **Skipped workflows stay pending:** Path/branch filters that skip the whole workflow leave required checks “Waiting for status.” Current `ci.yml` has no path filters on `pull_request`, which is good for requiring these three.

6. **Dependent jobs:** `docker-integration` and `e2e` `needs: quality`. If `quality` fails they are skipped; do not rely on skipped dependents alone — requiring all three is correct so a red `quality` still blocks via its own context.

7. **Merge queue (out of pack):** If a queue is added later, workflows must also listen for `merge_group` or required Actions checks never report on queue entries. Charting lock excludes merge queue for now.

8. **Do not confuse with `Vercel`:** Commit status `Vercel` appears on the same SHAs; requiring it is a separate product decision (RAD-195 Deployment Checks), not part of the main ruleset lock.

---

## 5. Confirmation: `main` unprotected (read-only)

As of this probe:

- `GET /repos/rvarbanov/saas-starter/branches/main` → `"protected": false`
- GraphQL `branchProtectionRule` on `refs/heads/main` → `null`
- Repository rulesets → none
- Effective rules on `main` → none

Direct pushes to `main` and merges without CI gates are therefore still possible until RAD-194 applies a ruleset. **This research did not change that.**

---

## Sources

- Repo workflow: `.github/workflows/ci.yml`
- Live APIs (2026-11-01): `gh api` rulesets, rules/branches/main, branches/main, check-runs on `d7f9844…`, Actions jobs for runs `41095845907` / `41075293125`, PR #74 status rollup, `users/rvarbanov`
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules)
- [Troubleshooting required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks)
- [REST: Create a repository ruleset](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset)
