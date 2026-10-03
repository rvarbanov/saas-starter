# Delete user

- **Map:** https://linear.app/radi-dev/issue/RAD-138/wayfinder-delete-user-handoff
- **Packed:** 2026-10-02
- **Status:** packed
- **Source children:** RAD-139, RAD-148, RAD-142, RAD-143, RAD-140, RAD-141, RAD-144, RAD-145, RAD-146, RAD-149, RAD-150, RAD-147

Language follows [`CONTEXT.md`](../../CONTEXT.md): **Delete user** is the Super admin pathway that marks an **App user** deleted without removing the record. A deleted App user is hidden from the **Users list**, and signing in again does not make them active. WorkOS still holds sign-in for that same person.

## Destination

A later build session implements **Delete user**. On **User detail** in view mode, a Super admin sees a red **Delete** control at the bottom of the page. Confirming opens a dialog whose only copy is “You’re about to delete this user. Are you sure you want to do that?” Cancel or Delete. Confirming calls the Convex mutation `deleteUser`, which sets `deletedAt` and leaves the row. Success replaces the page with the Users list and shows no success message. The WorkOS sign-in stays. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the build — this packed file is decision-complete; it does not implement UI.

After pack, **this file wins** over Linear map summaries and child issue bodies.

## Out of scope

- Implementing UI inside the Wayfinder map effort (plan-only; build is a later session)
- Calling WorkOS `DELETE /user_management/users/{id}` for this pathway. `deleteWorkOsUser` stays the Create User rollback helper only
- Revoking the existing session. It runs until it expires. The app does not store a session id
- Restore / undelete. The row stays so a later story can restore it
- Per-role test sign-in credentials — [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them)
- The role model — [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them) and [RAD-113](https://linear.app/radi-dev/issue/RAD-113/restrict-role-addremove-to-admins)
- Users list read lockdown — [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-list-read-to-super-admin-manager). Delete does not wait for it
- Edit User route split — [RAD-126](https://linear.app/radi-dev/issue/RAD-126/wayfinder-edit-user-handoff). Place Delete on view mode, including the interim in-place view in `components/user-detail.tsx`
- Bulk delete, Users list Load more, and new App user fields besides `deletedAt`
- E2E for Manager / Team member (button absent), the last-Super-admin error, the “Deleting…” label, a dialog error, the Edit User page, and a second Delete — [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete) remains a later rework

## Decisions

### Research: WorkOS delete an Auth user (RAD-139)

- `DELETE https://api.workos.com/user_management/users/{id}` permanently deletes that WorkOS user and cannot be undone.
- Docs do not say sessions are revoked. Revoke is a separate `POST /user_management/sessions/revoke` with `session_id`.
- Memberships and invitations are not documented preconditions.
- Artifact: [`docs/research/workos-delete-user.md`](../research/workos-delete-user.md) (research branch; do not block this build on that branch).
- **Product choice:** do not call that DELETE. The WorkOS sign-in stays.

### Soft delete the App user record (RAD-148)

- The App user record stays. Delete user marks it deleted.
- Do not hard-delete the Convex row.
- The only table is `users`. No cascade.

### What a soft delete changes (RAD-142)

- Hidden from the Users list.
- Opening that id again stays on the URL and shows the existing in-content “User not found” (`user-detail-not-found`). Do not invent a new empty state.
- No restore in this build.
- WorkOS sign-in stays.
- The next sign-in stays deleted: `upsertUserFromProfile` must not clear `deletedAt`.
- The existing session runs until it expires. `getMe` still returns the caller so the shell keeps working. Do not revoke the session.

### Who may delete an App user (RAD-140)

- Super admin only (`isSuperAdmin`). A caller who also has another role may still delete.
- Manager and Team member do not see Delete. The control is absent, not disabled.
- The server rejects anyone who is not a Super admin with `"Unauthorized"`.
- No self-delete. Compare App user ids. Error: `"Cannot delete your own user"`.
- A Super admin may delete another Super admin, except the last one. The count includes only App users who have the Super admin role and no `deletedAt`. Error: `"Cannot delete the last Super admin"`.

### Where Delete sits (RAD-141)

- Bottom of User detail, view mode only.
- Red `destructive` button. Label **Delete**.
- Rendered only when the caller may delete that App user (Super admin, and not themselves).
- Absent from the Users list.
- Absent from edit mode, and absent from `/dashboard/users/:userId/edit` when that route exists.
- Until [RAD-126](https://linear.app/radi-dev/issue/RAD-126/wayfinder-edit-user-handoff) lands, the interim UI is the view branch of `components/user-detail.tsx` (the branch that is not `user-detail-form`).

### Delete confirmation dialog (RAD-143)

- Component: shadcn alert dialog. Add with `pnpm exec shadcn add alert-dialog` (dry-run first; do not rewrite `components/ui/button.tsx`).
- The only dialog copy is: “You’re about to delete this user. Are you sure you want to do that?”
- Cancel is the safe default. Escape and click-outside cancel.
- Dialog Delete is red (`destructive`).
- Both actions disable while the mutation is pending. The confirm label reads “Deleting…”.
- On error, the dialog stays open. Show the error in `user-detail-delete-error` (`role="alert"`).
- No typed confirmation.

### After Delete succeeds (RAD-144)

- `router.replace` to the Users list (`APP_ROUTES.users`), so Back does not reopen that User detail.
- No success toast. The App user is simply absent from the list.
- Reopening the id shows the existing “User not found”.

### Delete user write API (RAD-145)

Public mutation `deleteUser` in `convex/users.ts` (not an action). No WorkOS call.

| | |
| --- | --- |
| **Endpoint** | `api.users.deleteUser` |
| **Args** | `{ userId: v.id("users") }` |
| **Returns** | `v.null()` |
| **Write** | Set `deletedAt` to `Date.now()` and `updatedAt` to the same time. Leave every other field. |

Schema: `deletedAt: v.optional(v.number())` on `users`. No new index.

Caller and roles are resolved on the server (`getCurrentUserOrThrow` / the existing auth helper). Do not trust a role sent by the client.

Check order:

1. Not signed in → `"Not authenticated"`.
2. Missing row, or `deletedAt` already set → `"User not found"`.
3. Caller is not a Super admin → `"Unauthorized"`.
4. `userId` is the caller → `"Cannot delete your own user"`.
5. Target is a Super admin and the number of Super admins with no `deletedAt` is 1 → `"Cannot delete the last Super admin"`.
6. Patch `deletedAt` and `updatedAt`. Return null.

Reads:

- `users.list`: drop rows with `deletedAt` inside `matchesListFilters` (same post-page filter as role and created-date). A page may be short, matching those filters.
- `users.getById`: return null when `deletedAt` is set, so the existing not-found UI runs.
- `getMe`: unchanged. A deleted caller’s session still loads.

`upsertUserFromProfile` (`convex/lib/upsertUser.ts`): the auth-profile patch must not set `deletedAt` and must not clear it. A later sign-in updates email / token / WorkOS id only.

Last-Super-admin count: paginate `by_updatedAt` until `isDone` and count in TypeScript. Do not `.collect()` the users table. Role is an array, so there is no contains index to add for this.

### Retry Delete on an already-deleted App user (RAD-149)

- When `deletedAt` is already set, `deleteUser` throws `"User not found"`. Same string as a missing row.
- The in-flight double click is the dialog: both actions stay disabled while the first call is pending.

### E2E expectations for Delete user build (RAD-146)

**Format:** named scenario checklist plus locked `data-testid`s. No Playwright source in this handoff.

**Organization and bar**

- New `tests/e2e/delete-user.spec.ts` on the **authenticated** project.
- In `playwright.config.ts`, add `delete-user.spec.ts` to the authenticated `testMatch` and to the chromium project’s `testIgnore` (same treatment as `create-user.spec.ts`).
- Keep shell **A–J**, User detail **K–O**, and Create User **P–S** green.
- Acceptance command: `pnpm test:e2e` (desktop Chromium).
- The signed-in `E2E_WORKOS_EMAIL` principal is the Super admin. No new secret. Fail-fast if the existing E2E secrets are missing.
- Live app. Do not mock Convex or WorkOS.

**Testids**

| testid | Purpose |
| --- | --- |
| `user-detail-delete` | Red Delete at the bottom of User detail |
| `user-detail-delete-dialog` | Confirmation dialog |
| `user-detail-delete-cancel` | Cancel |
| `user-detail-delete-confirm` | Dialog Delete |
| `user-detail-delete-error` | Error kept inside the dialog |

**Scenarios**

| ID | Scenario |
| --- | --- |
| **T** | Own User detail: `user-detail-delete` is absent. The Users list does not render it either. |
| **U** | Create `e2e-delete+<timestamp>@example.com` → User detail → `user-detail-delete` → dialog copy is only “You’re about to delete this user. Are you sure you want to do that?” → Cancel → dialog closes, still on that User detail, email still shown. |
| **V** | Create another disposable email → confirm Delete → Users list → that email is absent from the list → open the saved User detail URL → `user-detail-not-found` with “User not found”. |

### Does Delete wait for Users list read lockdown? (RAD-150)

- No. Delete ships on its own.
- Today `users.list` and `users.getById` only require a signed-in JWT. That stays until [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-list-read-to-super-admin-manager).
- The hidden control and `"Unauthorized"` are the Delete gate.

## Build checklist

1. **Schema:** Add `deletedAt: v.optional(v.number())` on `users` in `convex/schema.ts`.
2. **Mutation:** Add `deleteUser` in `convex/users.ts` with the args, returns, check order, and errors in **Delete user write API**.
3. **Reads:** Hide `deletedAt` rows in `matchesListFilters`. Return null from `getById` when `deletedAt` is set. Leave `getMe` alone.
4. **Sign-in:** In `convex/lib/upsertUser.ts`, keep `deletedAt` off the auth-profile patch.
5. **Tests:** Extend `convex/users.test.ts` for unauthorized, not found, already deleted, self-delete, last Super admin, a successful `deletedAt` write, list/getById hiding, and upsert leaving `deletedAt` in place.
6. **Dialog primitive:** `pnpm exec shadcn add alert-dialog` (dry-run first; protect `components/ui/button.tsx`).
7. **User detail:** In the view branch of `components/user-detail.tsx`, when the caller is a Super admin and the subject is someone else, render `user-detail-delete` at the bottom of `user-detail-page` (`variant="destructive"`, label Delete). Wire the alert dialog, pending state, inline error, and `router.replace(APP_ROUTES.users)` on success.
8. **E2E:** Add `tests/e2e/delete-user.spec.ts` for **T–V** and register it in `playwright.config.ts`.
9. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, then `pnpm test:e2e`.
10. **Convex deploy:** A human runs `pnpm convex:dev` (or equivalent) against the shared deployment so live functions match source. Do not run production `npx convex deploy` unattended.

## Acceptance criteria

- [ ] Product: Super-admin-only red Delete at the bottom of User detail view; dialog copy and Cancel-default behavior; `deleteUser` soft-deletes via `deletedAt`; list and by-id hide the row; sign-in does not clear `deletedAt`; success `router.replace`s to the Users list with no toast; WorkOS user is not deleted; session is not revoked
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] E2E: scenarios **T–V** in `tests/e2e/delete-user.spec.ts`; shell **A–J**, User detail **K–O**, and Create User **P–S** still pass; bar = `pnpm test:e2e`

## Open / deferred

- [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-list-read-to-super-admin-manager) — Users list reads stay “any signed-in JWT” until that story. Do not add that role check inside Delete.
- [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them) — test principals per role. Do not add a second E2E persona here.
- [RAD-126](https://linear.app/radi-dev/issue/RAD-126/wayfinder-edit-user-handoff) — when Edit moves to its own route, Delete stays on User detail view only.
- [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete) — later create → get → update → delete rework. This build’s E2E is **T–V** only.
- Restore of a soft-deleted App user is a later story. Do not add an undelete control or clear `deletedAt` from sign-in.
- List pages can be short after the `deletedAt` filter, same as the existing role filter. Do not invent a new pagination scheme.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-138/wayfinder-delete-user-handoff
- Children: RAD-139, RAD-148, RAD-142, RAD-143, RAD-140, RAD-141, RAD-144, RAD-145, RAD-146, RAD-149, RAD-150, RAD-147
- Research note: `docs/research/workos-delete-user.md`
- Contract: `docs/handoffs/CONTRACT.md`
