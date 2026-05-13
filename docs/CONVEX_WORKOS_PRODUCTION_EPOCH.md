# Epoch seed: Convex + WorkOS production readiness

**Purpose:** Snapshot of the current Convex and WorkOS implementation, what is done, and what remains before treating the integration as **production-ready**. Use this document to open an **epoch** (parent initiative) and **sub-issues** (concrete tickets).

**Source:** Code review of the repo (AuthKit, `convex/`, env split). Update this file when scope changes.

---

## Executive summary


| Layer                | MVP status                                                         | Production bar                                                                                             |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **WorkOS (Next.js)** | Sign-in, callback, session, `/dashboard` protected                 | Live dashboard config, secrets per environment, stable cookie password                                     |
| **Convex**           | URL guard, JWT `auth.config.ts`, token bridge, public `ping` query | `WORKOS_CLIENT_ID` on Convex deployment, prod deployment + URL, schema + **server-side auth** on real APIs |


---

## WorkOS AuthKit — completed (MVP wiring)


| Area             | Location / notes                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Provider shell   | `AuthKitProvider` in `app/layout.tsx`                                                           |
| Request boundary | `proxy.ts` — `authkitProxy`, `unauthenticatedPaths`: `/`, `/callback`, `/sign-in`               |
| OAuth callback   | `app/callback/route.ts` — `handleAuth({ returnPathname: "/dashboard" })`                        |
| Sign-in entry    | `app/sign-in/route.ts` — `getSignInUrl()` + redirect                                            |
| Protected route  | `app/dashboard/page.tsx` — `withAuth({ ensureSignedIn: true })`                                 |
| Public home      | `app/page.tsx` — `withAuth()`, links to `/sign-in` or `/dashboard`                              |
| Env split        | `.env`: client id, redirect, public URLs; `.secret`: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD` |


**Outcome:** Users can complete AuthKit sign-in and reach `/dashboard` at the Next.js layer.

---

## Convex — completed (connectivity + token bridge)


| Area                          | Location / notes                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| JWT validation config         | `convex/auth.config.ts` — WorkOS `customJwt` providers (requires `WORKOS_CLIENT_ID` on Convex)    |
| React integration             | `components/convex-auth-provider.tsx` — `ConvexProviderWithAuth` + `getAccessToken()` from WorkOS |
| Safe client boot              | `lib/convex-config.ts` — only construct client for real `https://*.convex.cloud` URLs             |
| Smoke API                     | `convex/ping.ts` — `getMessage` (public, no auth)                                                 |
| Schema                        | `convex/schema.ts` — **empty** (no tables)                                                        |
| Server-side auth in functions | **None** — no `ctx.auth.getUserIdentity()` usage yet                                              |


**Outcome:** Convex runs, the UI can call a public query, and access tokens are passed for future authenticated functions. Backend authorization is **not** enforced in Convex yet.

---

## Production readiness — gaps (issue seeds)

Use the subsections below as **epic children** or **epoch checklist items**.

### A. WorkOS — environment and dashboard

- Register **production** redirect URI(s) in WorkOS (e.g. `https://<prod-domain>/callback`); align with `NEXT_PUBLIC_WORKOS_REDIRECT_URI` per environment.
- Use consistent **test vs live** WorkOS keys with each environment.
- Configure **Vercel** (or host) secrets: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_CLIENT_ID`, and public URL / redirect vars as required by AuthKit.
- Document **cookie password** policy: generate once per env (`openssl rand -base64 32`), keep stable; rotation invalidates sessions.
- (Product) Roles, orgs, admin — **out of MVP** in code today; track separately if in scope.

### B. Convex — deployment and configuration

- Set `**WORKOS_CLIENT_ID`** on the **Convex** deployment: `npx convex env set WORKOS_CLIENT_ID …` (required for JWT validation in `auth.config.ts`).
- **Production** Convex project + `**NEXT_PUBLIC_CONVEX_URL`** for production builds (separate from dev if desired).
- **Deploy path:** `pnpm convex deploy` and/or CI with `**CONVEX_DEPLOY_KEY`** so prod always matches `convex/` in git.

### C. Convex — application security and data

- Define `**schema.ts`** (tables, indexes) for real features.
- Implement queries/mutations that use `**ctx.auth.getUserIdentity()`**; return errors or empty results when unauthenticated as appropriate.
- **Never** accept client-supplied `userId` for authorization; derive identity only server-side in Convex.
- Add integration tests or manual test plan: signed-in user sees correct data; signed-out or wrong token cannot mutate others’ data.

### D. Cross-cutting “definition of done”

- End-to-end verification on **production URL** with **live** WorkOS + **prod** Convex deployment.
- Every Convex function that touches **user-owned data** validates `**getUserIdentity()`** (or explicit public read policy documented).

---

## Suggested epoch / sub-issue titles (copy into tracker)

**Epoch (parent):** `Convex + WorkOS production hardening`

**Sub-issues (examples):**

1. WorkOS: production redirect URIs and environment matrix (dev / preview / prod)
2. WorkOS: Vercel (host) secrets and `NEXT_PUBLIC_`* alignment
3. Convex: set `WORKOS_CLIENT_ID` on dev + prod Convex deployments
4. Convex: prod deployment + `NEXT_PUBLIC_CONVEX_URL` + deploy/CI key
5. Convex: initial schema + first authenticated mutation/query with `getUserIdentity()`
6. Convex: security review — no client-trusted user ids; arg validation on public APIs
7. E2E or manual runbook: sign-in → dashboard → authenticated Convex path on prod-like stack

---

## Related docs

- `README.md` — env file split (`.env` / `.secret`)
- `docs/IMPLEMENTATION.md` §2.2 — Convex env, `pnpm convex:dev`, WorkOS on Convex
- `docs/SPECIFICATION.md` — broader product scope (roles, routes) beyond this integration