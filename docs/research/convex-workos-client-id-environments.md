# Research: Map Convex WORKOS_CLIENT_ID to WorkOS environment names

**Ticket:** [RAD-207](https://linear.app/radi-dev/issue/RAD-207/research-map-convex-workos-client-id-to-workos-environment-names)  
**Parent map:** [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff) (Stop unchecked deploys)  
**Related execution:** [RAD-190](https://linear.app/radi-dev/issue/RAD-190/verify-convex-workos-client-id-matches-both-sign-in-sources)  
**Question:** Which WorkOS **environment name** does the live Convex deployment trust, and how should CI vs prod pair after a separate CI Convex exists?

**Redaction:** This note reports **environment names only**. No client IDs, API keys, cookie passwords, or deploy keys.

---

## Verdict

Live Convex deployment `incredible-dalmatian-315` **defines** `WORKOS_CLIENT_ID` and that value matches WorkOS environment **`local`**.

| Surface | WorkOS environment (name) | Same as Convex? |
| --- | --- | --- |
| Convex `incredible-dalmatian-315` JWT trust (`auth.config.ts`) | **local** | — |
| CI e2e / committed `.env` AuthKit client | **local** | Yes — aligned with Convex |
| Vercel production AuthKit sign-in | **production** | **No** — mismatches Convex |

**After the charted split:** CI Convex ↔ WorkOS **`local`**; prod Convex ↔ WorkOS **`production`**. Today CI already matches Convex on **`local`**; the gap is Vercel **production** signing tokens Convex will not accept until prod Convex trusts **`production`**.

---

## 1. WorkOS project environments

WorkOS team project **radi's Project** (queried via WorkOS MCP `whoami`) exposes three environments:

| Environment name | Sandbox? | Role in this app (observed) |
| --- | --- | --- |
| **local** | yes | Local + CI AuthKit; Convex JWT trust today |
| **production** | no | Vercel production AuthKit (`saas-starter-bay-ten.vercel.app`) |
| **dev-not-used** | yes | Unused by this repo’s committed `.env` / live Convex |

Default AuthKit apps (WorkOS MCP `defaultAuthkitApplication`):

- **local** → app homepage / redirect `http://localhost:3000` (+ `/callback`)
- **production** → app homepage / redirect `https://saas-starter-bay-ten.vercel.app` (+ `/callback`)

Sources: WorkOS MCP `whoami`, `defaultAuthkitApplication`, `redirectUris` for each environment id.

---

## 2. Convex live deployment

### Deployment identity

- Committed `.env` sets `NEXT_PUBLIC_CONVEX_URL` to `https://incredible-dalmatian-315.convex.cloud` (deployment slug only; no secrets).
- Cloud Agent `CONVEX_DEPLOY_KEY` prefix classifies that target as Convex kind **`dev`** for slug `incredible-dalmatian-315` (still the shared live backend CI deploys to and the app URL points at).
- Official Convex MCP `status` was not authorized in this session; env was read with the Convex CLI against that deploy key instead.

### `WORKOS_CLIENT_ID` on Convex

| Check | Result |
| --- | --- |
| Variable defined? | **Yes** |
| Maps to WorkOS environment | **local** (private compare to WorkOS `whoami` client ids; value not recorded here) |
| Matches committed `.env` client? | **Yes** (same private compare) |
| `WORKOS_API_KEY` also defined? | **Yes** (presence only) |

Other Convex env names present (values redacted / irrelevant): `SITE_URL`, `JWKS`, `JWT_PRIVATE_KEY`, `CONVEX_OPENAI_*`.

### How Convex uses it

`convex/auth.config.ts` builds a single WorkOS `customJwt` provider set from `process.env.WORKOS_CLIENT_ID` (JWKS URL + `applicationID` / user-management issuer). One client id ⇒ one WorkOS environment’s tokens are trusted.

Sources:

- Repo: `convex/auth.config.ts`, committed `.env` (client compared privately), `.github/workflows/ci.yml` Convex deploy step.
- Convex CLI: `convex env list` / `convex env get WORKOS_CLIENT_ID` via deploy key (values not written here).
- Docs: [Convex & WorkOS AuthKit](https://docs.convex.dev/auth/authkit/) — set `WORKOS_CLIENT_ID` per deployment; configure different AuthKit instances on dev vs prod Convex deployments.

---

## 3. What CI e2e uses today

| Input | Source | WorkOS environment |
| --- | --- | --- |
| `WORKOS_CLIENT_ID` | Committed `.env` (CI comment: do not override with a placeholder) | **local** |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | CI job env → `http://localhost:3000/callback` | Matches **local** AuthKit redirect |
| `WORKOS_API_KEY`, `E2E_WORKOS_*` | GitHub Actions secrets | Expected to be the **local** sandbox credentials (not decrypted here; redirect + client pairing imply local) |
| Convex backend | Same `incredible-dalmatian-315` via `CONVEX_DEPLOY_KEY` on the e2e job | Trusts **local** |

So **CI AuthKit and live Convex currently agree** on WorkOS **`local`**. That is why authenticated e2e can succeed against the shared deployment even while production AuthKit uses a different environment.

Sources: `.github/workflows/ci.yml` (`e2e` job), committed `.env`, `AGENTS.md` / `README.md` e2e secret notes, WorkOS **local** redirect URI list.

---

## 4. What Vercel production uses

| Signal | Finding |
| --- | --- |
| Vercel project `saas-starter` env | `WORKOS_CLIENT_ID` exists, target **production** (sensitive; MCP did not return a decrypted value) |
| Production domain | `saas-starter-bay-ten.vercel.app` |
| WorkOS **production** AuthKit app | Homepage / initiate-login / callback bound to that domain |
| Live probe | Unauthenticated `/dashboard` on production follows AuthKit; client id in that flow maps to WorkOS **production** (private compare; not recorded) |

Vercel MCP `filter_project_envs` listed production AuthKit secrets (`WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`) but **did not** list a production override for `NEXT_PUBLIC_CONVEX_URL` in the returned set — production likely still points at the same public Convex URL from committed `.env` / build defaults (`incredible-dalmatian-315`). That is the cross-environment hazard: **production** WorkOS tokens against a Convex deployment that trusts **local**.

Sources: Vercel MCP `get_project`, `filter_project_envs`, `list_deployments`; WorkOS MCP production AuthKit app + redirect URIs; HTTP probe of production `/dashboard` (environment name only).

---

## 5. Gaps (names only)

1. **Vercel production ↔ Convex mismatch:** production AuthKit = WorkOS **`production`**; Convex JWT trust = WorkOS **`local`**. Tokens from prod sign-in should fail Convex `customJwt` validation (wrong client / JWKS / issuer path) until prod Convex is retargeted.
2. **CI ↔ Convex:** aligned on **`local`** — not a gap for e2e today; it **is** a gap for the charted goal of isolating CI from the production-trusted backend.
3. **Single shared Convex deployment** (`incredible-dalmatian-315`) serves CI deploys and the production app URL, so you cannot set one `WORKOS_CLIENT_ID` that matches both **local** and **production** at once (charting already locked: one client id per Convex deployment).
4. Unused WorkOS env **`dev-not-used`** is not part of the pairing plan.

---

## 6. Recommended pairing after separate CI Convex

Charting lock (RAD-203): **one WorkOS client ID per Convex deployment**.

| Convex deployment | WorkOS environment name | Who signs in |
| --- | --- | --- |
| **CI** Convex (new; distinct deploy key / secret) | **local** | GitHub Actions e2e + local/dev AuthKit |
| **Prod** Convex (today’s live slug or a future prod-kind deployment) | **production** | Vercel production AuthKit |

Operational notes:

- Keep committed `.env` / CI client on **local**; point CI’s `NEXT_PUBLIC_CONVEX_URL` (and deploy key) at the CI Convex deployment once it exists.
- On the Convex deployment that Vercel production calls, set `WORKOS_CLIENT_ID` (and API key) to the WorkOS **production** environment — not **local**.
- Do not put both client ids into one `auth.config.ts` provider list on a shared deployment (map out of scope; charting forbids multi-provider on one shared Convex).

Official docs already describe setting different `WORKOS_CLIENT_ID` values on Convex development vs production deployments: [Configuring dev and prod instances](https://docs.convex.dev/auth/authkit/).

---

## 7. Leftover verify steps for RAD-190

RAD-207 answers “which environment does Convex hold?” Research does **not** close RAD-190. Remaining execution acceptance:

1. **Retarget / split deployments** so CI and production no longer share one Convex `WORKOS_CLIENT_ID` (blocked on / paired with [RAD-184](https://linear.app/radi-dev/issue/RAD-184/ci-deploys-convex-to-the-live-backend-from-every-pr-run) separate CI Convex).
2. Set CI Convex env → WorkOS **`local`**; set prod Convex env → WorkOS **`production`** (names only in tickets; set values via dashboard/CLI).
3. **Confirm production sign-in end-to-end against Convex** on the production URL (dashboard user provision / authenticated query) after prod Convex trusts **`production`**.
4. Confirm CI e2e still green against CI Convex + **`local`**.
5. Optional hygiene: document that `incredible-dalmatian-315` is currently a Convex **`dev`**-kind deploy key target used as the live URL — decide whether prod should move to a Convex production deployment as part of the split.

---

## Sources

- Linear: [RAD-207](https://linear.app/radi-dev/issue/RAD-207/research-map-convex-workos-client-id-to-workos-environment-names), [RAD-203](https://linear.app/radi-dev/issue/RAD-203/wayfinder-stop-unchecked-deploys-handoff), [RAD-190](https://linear.app/radi-dev/issue/RAD-190/verify-convex-workos-client-id-matches-both-sign-in-sources)
- Repo: `convex/auth.config.ts`, `.env` (private compare), `.github/workflows/ci.yml`, `AGENTS.md`, `README.md`
- WorkOS MCP: `whoami`, `defaultAuthkitApplication`, `redirectUris`
- Convex CLI (deploy key): `env list` / `env get` — names + private value mapping only
- Vercel MCP: project envs / production domain; live AuthKit redirect probe (environment name only)
- Docs: [Convex AuthKit](https://docs.convex.dev/auth/authkit/), [AuthKit troubleshooting](https://docs.convex.dev/auth/authkit/troubleshooting)
