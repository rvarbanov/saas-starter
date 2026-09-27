# Edit User

- **Map:** https://linear.app/radi-dev/issue/RAD-126/wayfinder-edit-user-handoff
- **Packed:** 2026-09-26
- **Status:** packed
- **Source children:** RAD-129, RAD-130, RAD-131, RAD-132, RAD-133, RAD-134

Language follows [`CONTEXT.md`](../../CONTEXT.md): **Edit User**, **Create User**, **User detail**, **Profile**, **App user**, **Auth user**, **Users list**.

## Destination

A later build removes in-place edit from User detail and adds **Edit User** at `/dashboard/users/:userId/edit` (Convex `users._id`). Create User, Edit User, and Profile share one fields form. Email is required; first name and last name are optional. This MVP does not write roles. Save is a full form replace of names and email. Every write page has **Save** and **Cancel**. WorkOS receives email only. `updateUserDetail` is renamed `updateUser`. Profile uses that action on the signed-in App user. `updateName`, `updateEmail`, and `patchEmailInternal` are deleted. Users list stays `/dashboard/users`. Create User stays `/dashboard/users/new`. When this file’s Acceptance criteria pass, the map destination is met. This file does not implement UI.

After pack, **this file wins** over Linear map summaries and child issue bodies. It supersedes in-place edit in [`user-detail.md`](./user-detail.md). View behavior that this file does not replace stays as that older handoff described it, duplicated below where the build must not break it.

## Out of scope

- Implementing UI inside the Wayfinder map effort
- `/dashboard/users/list`, `/dashboard/users/:id/detail`, `/details`
- Changing Users list or Create User URLs. Profile route stays `/dashboard/profile`
- Deleting packed handoffs
- Invite resend / email customization — [RAD-124](https://linear.app/radi-dev/issue/RAD-124/grill-workos-invite-resend-and-email-customization)
- Directory authz — [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager)
- App user delete; Users list Load more; new App user fields
- Idempotent Create / Save — [RAD-127](https://linear.app/radi-dev/issue/RAD-127/idempotent-create-user-and-user-detail-save)
- Bulk-clearing historical WorkOS names; AuthKit hosted sign-up name fields
- Renaming User detail to View User
- Unsaved-changes prompt / `beforeunload`
- Role assignment — [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them)
- WorkOS verify-by-code email change — [RAD-137](https://linear.app/radi-dev/issue/RAD-137/workos-email-change-workflow)

## Decisions

### Edit User route, breadcrumbs, and navigation (RAD-129)

- `userEditPath(userId)` → `/dashboard/users/${userId}/edit` in `lib/app-routes.ts`.
- `parseUserEditId(pathname)` returns the Convex id only for `/dashboard/users/:id/edit`. Null for the list, `new`, a bare id, a reserved id segment, and extra segments.
- No `APP_ROUTES.usersEdit`. `parseUserDetailId` stays view-only (one segment). `RESERVED_ROUTE_SEGMENTS` already includes `edit`.
- Page: `app/dashboard/users/[userId]/edit/page.tsx`. Document title **Edit user**. No `[userId]/layout.tsx`.
- User detail **Edit** is a real `Link` to Edit User. Users list rows stay links to User detail only.
- Save success: `router.replace` to User detail for the same id.
- Cancel: real `Link` to User detail.
- Breadcrumbs: Dashboard → Users → {person} → Edit. Person links to `userDetailPath`. **Edit** is the non-link leaf. Reuse `userDetailLeafLabel`. Header loads the person via `parseUserEditId` or `parseUserDetailId`. Extend `appBreadcrumbTrail`. No new breadcrumb component.
- Missing or invalid id: stay on the `/edit` URL. In-content “User not found”. Do not link a missing person. No redirect. No chrome-dropping Next 404.
- Sidebar: no nav-item change. Users prefix already covers `/edit`.

### Create User and Edit User required vs optional fields (RAD-130)

- Email required: non-empty after trim; existing format and normalize helpers.
- First name and last name optional: blank or whitespace stores unset, not `""`. Max length still applies when non-empty (`MAX_NAME_LENGTH` / `normalizeNames`).
- Save is a full form replace of the fields the action accepts. Omit does not mean “leave unchanged.”
- Role optionality in this ticket is overturned for writes by RAD-132 below. Do not add role checkboxes.

### Shared Create User / Edit User / Profile form and Save/Cancel chrome (RAD-131)

- Shared component: `components/user-form.tsx`.
- It owns the `h1`, the header-row **Save** / **Cancel**, the fields, and one form-level `role="alert"` error.
- Pages own `page-main`, loading, not-found, the submit handler, and `cancelHref`.
- Retire `components/profile-name-form.tsx`.
- Order: First name → Last name → Email → Roles.
- Email: asterisk in the label (not color-only) and `aria-required="true"` on the input. Forms stay `noValidate`. Do not set HTML `required`. Validate on submit only. Same strings as today (`Invalid email address`; name max length).
- Idle label **Save**. Pending label **Saving…**. Overturns packed Create User **Create user** / **Creating…**. The Users list entry stays **Create user**.
- Create User: `h1` **Create user**. Cancel → Users list. `roles` not written (no checkboxes). Success `replace` → User detail. `?invite=failed` unchanged.
- Edit User: `h1` **Edit user**. Cancel → User detail. Roles are read-only `formatRoleLabels` text (`edit-user-roles`). No identity meta and no invite banner on this page (those stay on User detail view). Loading copy on `edit-user-page`. Not-found uses `edit-user-not-found`.
- Profile: `h1` **Profile** (`heading-page`). Drop the eyebrow and **Your name**. Crumbs stay Dashboard → Profile. Email is an editable input. Roles are read-only text (`profile-roles`). Cancel `href` is `/dashboard/profile` and the click also resets the draft and clears the error. Do not `preventDefault`. Do not add a query-string remount. Save success stays on Profile. The saved values become the dirty-gate baseline. Keep `profile-loading` and `profile-missing`.
- Dirty-gate: Create User initial draft is empty. Edit User and Profile initial draft is the loaded App user. Save disabled until dirty and while pending. Cancel enabled except while pending (`aria-disabled`, no navigation). Pending freezes inputs, Save, and Cancel. A live query must not clobber a dirty draft.
- Save failure: stay on the page, keep drafts, one form-level error, clear it on the next Save attempt.
- No unsaved-navigation prompt.

Test ids:

| Surface | ids |
| --- | --- |
| Create User | Keep `create-user-page`, `create-user-form`, `create-user-first-name`, `create-user-last-name`, `create-user-email`, `create-user-submit`, `create-user-cancel`, `create-user-error`. Drop `create-user-role-*`. |
| Edit User | `edit-user-page`, `edit-user-form`, `edit-user-first-name`, `edit-user-last-name`, `edit-user-email`, `edit-user-roles`, `edit-user-submit`, `edit-user-cancel`, `edit-user-error`, `edit-user-not-found`. No `edit-user-role-*`. |
| Profile | `profile-form` (retire `profile-name-form`), `profile-first-name`, `profile-last-name`, `profile-email` (the input), `profile-roles`, `profile-submit`, `profile-cancel`, `profile-error` (retire `profile-name-error`). Keep `profile-loading` and `profile-missing`. |

### createUser / updateUser write API alignment (RAD-132)

Two public actions. Do not merge them.

| | `usersActions.createUser` | `usersActions.updateUser` (rename from `updateUserDetail`) |
| --- | --- | --- |
| Args | `{ email: string, firstName?: string, lastName?: string }` | `{ userId, firstName: string, lastName: string, email: string }` |
| Names | Omit or empty → unset | `""` allowed so a field can be cleared → unset |
| Roles | No `roles` arg. New App user roles are `[]` | No `roles` arg. Existing roles stay, including `super_admin` |
| Returns | `{ user, inviteSent }` (unchanged) | Public App user doc (`userDocValidator`). Profile may ignore it |
| Auth | JWT. Missing session → `"Not authenticated"` | Same. Missing target → `"User not found"` |

- Delete `users.updateName`, `usersActions.updateEmail`, and `users.patchEmailInternal`.
- `createWorkOsUser` accepts email only. POST body is `{ email }`. Drop `firstName` / `lastName` params.
- `updateUser` calls WorkOS only when the email changed and the subject has a WorkOS id. PUT body is `{ email }` only. No WorkOS id → patch Convex only.
- Email all-or-nothing: if the Convex patch fails after a successful WorkOS PUT, PUT the previous email back. If that rollback PUT fails, throw `"Email updated in WorkOS but failed to sync to the app. Sign in again or contact support."`
- Stay signed in. Do not force re-login.
- Create User order otherwise stays: validate, WorkOS create, Convex insert, roll back the Auth user if insert fails, invite best-effort.
- Do not copy WorkOS names into Convex on provision. Do not bulk-clear historical WorkOS names.

### E2E expectations for Edit User build (RAD-133)

Bar: `pnpm test:e2e` / `make e2e` (not `e2e-prod`). Desktop Chromium. Existing E2E secrets. Fail if secrets are missing.

| ID | File | Scenario |
| --- | --- | --- |
| K–M | `tests/e2e/user-detail.spec.ts` | Unchanged User detail view checks |
| N | same | Edit link → `/edit` → change first and last name only → Save → User detail shows the new names. Signed-in E2E user. Do not change email |
| O | same | Edit link → change a name → Cancel link → User detail heading unchanged; draft name absent |
| P–S | `tests/e2e/create-user.spec.ts` | Unchanged. **P** clicks `create-user-submit` |
| T | `tests/e2e/edit-user.spec.ts` | Edit is a link to `/edit`. Crumbs Dashboard → Users → person → Edit. `h1` **Edit user**. `edit-user-roles` is text. No role checkboxes |
| U | `tests/e2e/profile.spec.ts` | `h1` **Profile**. `profile-email` is an input. `profile-roles` is text. Save a first name and stay on `/dashboard/profile`. Do not fill `profile-email` |
| V | same | Change the draft, click `profile-cancel`, draft resets, URL stays `/dashboard/profile` |

Update the Avatar-menu walk in place: heading **Profile**, and `profile-form` or `profile-loading`. Retire **Your name** and `profile-name-form`.

Update unit specs that assert **Creating…** or `create-user-role-*`. Those are not new Playwright letters.

Keep shell **A–J** green.

Out of Acceptance: role writes and role checkboxes; Edit User not-found; teardown of users **P** creates; WorkOS name-strip; dirty-gate and **Saving…**; invite-failed banner; email change on Profile or Edit User; editing an App user other than the signed-in E2E user.

### User detail view to keep (from the superseded handoff)

Do not drop these when in-place edit goes away:

- Route `/dashboard/users/[userId]`. In-content not-found. Row on the Users list is a link to User detail.
- View shows the public App user doc, including identity-link fields (app user id, token identifier, WorkOS user id, Convex id, created, updated) and plain-text roles (`formatRoleLabels`, empty → **None**).
- Invite-failed banner stays on User detail (`user-detail-invite-failed-banner` / `user-detail-invite-failed-dismiss`), not on Edit User.
- Breadcrumbs on the view: Dashboard → Users → person.

## Build checklist

1. `lib/app-routes.ts`: add `userEditPath` and `parseUserEditId`. Leave `parseUserDetailId` view-only.
2. `lib/app-nav.ts` and `components/app-header.tsx`: four-segment Edit User crumbs; load the person from either parser.
3. `convex/lib/workosApi.ts`: `createWorkOsUser({ email })` only.
4. `convex/usersActions.ts`: rename `updateUserDetail` → `updateUser` with the args and email rollback above. Stop passing names into WorkOS from `createUser`. Drop `roles` from both public actions. Delete `updateEmail`.
5. `convex/users.ts`: new App users from `insertCreatedUser` get `roles: []`. `updateUser`’s internal patch does not write roles. Delete `updateName` and `patchEmailInternal`.
6. `components/user-form.tsx`: shared form per RAD-131. Wire Create User, Edit User, and Profile. Delete `components/profile-name-form.tsx`.
7. `app/dashboard/users/[userId]/edit/page.tsx`: Edit User page, loading, not-found.
8. `components/user-detail.tsx`: view only. **Edit** is a `Link` to `userEditPath`. Remove in-place edit, `user-detail-form`, and the edit-mode identity meta under the form. Keep view fields and the invite banner.
9. `app/dashboard/profile/page.tsx`: `h1` **Profile**. Drop eyebrow and **Your name**.
10. `app/dashboard/users/new`: shared form; submit label **Save** / **Saving…**; no role checkboxes.
11. Unit tests: drop role-checkbox and **Creating…** assertions; cover `userEditPath` / `parseUserEditId` and the shared form.
12. E2E: rewrite **N**/**O**; add **T**, **U**, **V**; update the Avatar-menu walk. Keep **A–S** and **K–M** green.
13. Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `pnpm test:e2e`.
14. Convex push is a human step (`pnpm convex:dev` or equivalent). Do not run production `npx convex deploy` unattended.

## Acceptance criteria

- [ ] Product: Edit User route, crumbs, shared form, Profile chrome, `updateUser` / `createUser` contracts, and User detail view-only behavior match **Decisions**
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] E2E: **K–V** as in the table above; shell **A–J** still pass; bar = `pnpm test:e2e` / `make e2e`

## Open / deferred

- [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them) — roles table and who may assign them. This build does not write roles.
- [RAD-137](https://linear.app/radi-dev/issue/RAD-137/workos-email-change-workflow) — send-code / confirm vs direct PUT. This build stays signed in and uses a direct email PUT with compensating rollback.
- [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-directory-read-to-super-admin-manager) — directory authz. JWT-only until then.
- [RAD-124](https://linear.app/radi-dev/issue/RAD-124/grill-workos-invite-resend-and-email-customization) — invite resend.
- [RAD-127](https://linear.app/radi-dev/issue/RAD-127/idempotent-create-user-and-user-detail-save) — idempotent Create / Save.
- [RAD-114](https://linear.app/radi-dev/issue/RAD-114/e2e-user-detail-edit-via-create-get-update-delete) — teardown of created users.
- Edit User not-found, dirty-gate, **Saving…**, invite-failed banner, and email-change are implemented as specified but are not Playwright Acceptance.
- Toasts: do not add them.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-126/wayfinder-edit-user-handoff
- Assemble: https://linear.app/radi-dev/issue/RAD-134/assemble-edit-user-handoff-spec
- Children: [RAD-129](https://linear.app/radi-dev/issue/RAD-129/edit-user-route-breadcrumbs-and-navigation), [RAD-130](https://linear.app/radi-dev/issue/RAD-130/create-user-and-edit-user-required-vs-optional-fields), [RAD-131](https://linear.app/radi-dev/issue/RAD-131/shared-create-user-edit-user-profile-form-and-savecancel-chrome), [RAD-132](https://linear.app/radi-dev/issue/RAD-132/createuser-updateuser-write-api-alignment), [RAD-133](https://linear.app/radi-dev/issue/RAD-133/e2e-expectations-for-edit-user-build)
- Superseded view/edit handoff: [`docs/handoffs/user-detail.md`](./user-detail.md)
- Create User handoff (still packed): [`docs/handoffs/create-user.md`](./create-user.md)
- CONTRACT: [`docs/handoffs/CONTRACT.md`](./CONTRACT.md)
