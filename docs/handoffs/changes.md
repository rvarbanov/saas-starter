# Changes

- **Map:** https://linear.app/radi-dev/issue/RAD-161/wayfinder-changes-handoff
- **Packed:** 2026-10-05
- **Status:** packed
- **Source children:** none — grilled in one session and packed directly

Language follows [`CONTEXT.md`](../../CONTEXT.md): **Change**, **Changes**, **Action**, **Tracked field**, **System**, **App user**, **User detail**, **Create User**, **Edit User**, **Profile**, **Delete user**.

## Destination

A later build records a **Change** whenever App user product data is created, updated, or deleted, and shows **Changes** on User detail. One shape fits a later resource: that resource brings its own exclusion list and its own detail page. This build wires App user only. Create and delete store the action. An update stores the before and after of each tracked field that differs. Who is the App user when a user action caused the write, and the system when a process outside any user action caused it. The App user write and its Change commit together. When this file’s Acceptance criteria pass, the map destination is met. This file does not implement UI.

After pack, **this file wins** over the Linear map summary.

## Out of scope

- Implementing UI inside the Wayfinder map effort
- User activity: sign-in events, page views, invites, failures
- Wiring any resource besides App user
- An admin screen that opens a deleted App user and shows that person’s Changes. Delete user stays as packed in [`delete-user.md`](./delete-user.md): the row stays, the Users list hides it, and User detail shows “User not found”
- The role-assignment pathway — [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them). This build records `setRoles`; it does not add a roles editor
- Users list read lockdown — [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-list-read-to-super-admin-manager). Changes use the same signed-in gate as User detail until that story
- Backfill of Changes for writes that already happened
- Editing or deleting a Change after it is written
- Recording which page submitted an update (Profile vs Edit User)

## Decisions

### One Change per write

- A Change is one row: action, who, when, which resource, and, for an update, the tracked fields that differ.
- Actions are `create`, `update`, and `delete`.
- Create and delete store the action only. Their `fields` array is empty.
- An update stores one entry per tracked field that differs, in this order: `firstName`, `lastName`, `email`, `roles`.
- A write that changes no tracked field stores no Change. That includes a Save with the same names and email, a `setRoles` call that leaves the role set the same, and a sign-in that only refreshes identity links.
- The Change is inserted in the same Convex mutation as the App user write. If the insert fails, the App user write does not stick.
- `at` is `Date.now()` in that mutation. When the user write also sets `updatedAt`, use the same timestamp.
- No public or internal function updates or deletes a Change row.

### Who

- When a user action caused the write, `actorKind` is `user` and `actorUserId` is that App user’s `users._id`. If any part of the write comes from a user action, the actor is that person.
- When a process outside any user action caused the write, `actorKind` is `system` and `actorUserId` is omitted.
- The client never sends the actor. The server resolves the signed-in App user, or records system when that call has no user action.
- Create User, Edit User, Profile, and Delete user record the signed-in App user. A manager editing someone else records the manager, not the subject.
- Sign-in is a user action. A first provision that inserts an App user records `create` with that new App user as the actor. A later sign-in that changes email records `update` with that same App user as the actor.
- `setRoles` takes an optional `actorUserId`. Present: that App user must exist, and the actor is that user. Omitted: the actor is system. Today’s dashboard and script calls omit it. [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them) passes the signed-in App user when it ships.

### App user tracked fields

Excluded, never stored on a Change: `updatedAt`, `createdAt`, `tokenIdentifier`, `workosUserId`, `appUserId`, `searchText`, `deletedAt`.

Tracked: `email`, `firstName`, `lastName`, `roles`.

- Compare names and email after the existing normalizers. Unset and missing are the same. Blank names stay unset, not `""`.
- Compare roles after `uniqueRoles`. Same members in the same stored order are not a difference.
- `searchText` stays derived from first name, last name, and email. It never appears as its own field pair. The App user has no stored combined name.
- A later resource adds its own exclusion list. This build does not add a registry or a second table.

Stored field values:

- `firstName`, `lastName`, `email`: the stored string, or `null` when unset.
- `roles`: `null` when the set is empty, otherwise the `uniqueRoles` literals joined with `", "` (`manager, team_member`).

### Which App user writes record a Change

| Write | Where | Action | Actor |
| --- | --- | --- | --- |
| Create User insert | `insertCreatedUser` in `convex/users.ts` | `create` | Signed-in caller, passed from `createUser` in `convex/usersActions.ts` |
| First sign-in insert | `upsertUserFromProfile` in `convex/lib/upsertUser.ts` | `create` | The new App user |
| Edit User and Profile | `patchUserDetailInternal` | `update` when a tracked field differs | Signed-in caller, passed from `updateUser` |
| Sign-in patch | `patchAuthProfile` | `update` only when `email` differs | That App user |
| Delete user | `deleteUser` | `delete` | Signed-in caller already resolved in the mutation |
| `setRoles` | `convex/users.ts` | `update` when `roles` differs | `actorUserId` when passed, otherwise system |

`backfillSearchText` touches `searchText` only and records nothing.

Delete user still sets `deletedAt` and `updatedAt` and leaves every other field. The Change is action `delete` with empty `fields`. `deletedAt` is not a field pair.

### Changes on User detail

- Whoever can open User detail sees Changes. The query uses the same signed-in gate as `users.getById` (`requireIdentity`). It does not add a role check.
- Place the block in `components/user-detail.tsx` inside `user-detail-page`, after `UserDetailViewFields`, before `DeleteUserControl`.
- Heading is an `h2`: **Changes**. The page `h1` stays the person.
- Newest first. The first request asks for 20. A **Load older** button asks for the next 20 when `isDone` is false. Hide the button when the list is finished.
- Empty list, and no further page: the text **No changes yet**.
- Each row shows the action label (**Create**, **Update**, **Delete**), the actor label, and the time via `formatListedUserDate`.
- Actor label: **System** when `actorKind` is `system`. **Deleted user** when the actor row is missing or has `deletedAt`. Otherwise `userDetailLeafLabel` (first name and last name, then email). The actor is plain text, not a link.
- An update lists each differing field with the labels **First name**, **Last name**, **Email**, **Roles**. `null` names and email render as `—`. Roles render through `formatRoleLabels` (`None` when the set is empty).
- Create and delete rows do not render a field list.
- A deleted subject still has no User detail page. `getById` stays null. The page does not fetch Changes in that state. The rows remain in the table.

Test ids:

- `user-detail-changes` on the section
- `user-detail-changes-empty` on the empty text
- `user-detail-change` on each row
- `user-detail-changes-load-older` on the button

### Change storage and read API

Table `changes` in `convex/schema.ts`:

| Field | Validator |
| --- | --- |
| `resourceKind` | `v.literal("app_user")` |
| `subjectId` | `v.string()` — the subject’s Convex `_id` |
| `action` | `v.union(v.literal("create"), v.literal("update"), v.literal("delete"))` |
| `actorKind` | `v.union(v.literal("user"), v.literal("system"))` |
| `actorUserId` | `v.optional(v.id("users"))` |
| `at` | `v.number()` |
| `fields` | array of `{ field, before, after }` |

`field` is `v.union` of `v.literal("firstName")`, `v.literal("lastName")`, `v.literal("email")`, `v.literal("roles")`. `before` and `after` are `v.union(v.string(), v.null())`.

Index: `by_subject_and_at` on `["resourceKind", "subjectId", "at"]`.

A user actor always sets `actorUserId`. System omits it. Reject a system row that includes `actorUserId`, and a user row that omits it, inside the helper before insert.

Public query `changes.listForAppUser` in `convex/changes.ts`:

| | |
| --- | --- |
| **Endpoint** | `api.changes.listForAppUser` |
| **Args** | `{ userId: v.id("users"), paginationOpts: paginationOptsValidator }` |
| **Auth** | `requireIdentity`. Missing identity throws `"Not authenticated"`. |
| **Query** | `withIndex("by_subject_and_at", q => q.eq("resourceKind", "app_user").eq("subjectId", userId)).order("desc").paginate(...)` |
| **Page size** | `CHANGES_PAGE_SIZE = 20` in `convex/lib/pagination.ts`. Clamp with the existing `clampPaginationNumItems`. |

Each page item returns `action`, `at`, `actorLabel`, and `fields: { label, before, after }[]` already formatted. Resolve `actorLabel` in the query by reading the actor document, including rows with `deletedAt`. Do not call `getById` for the actor; that helper hides deleted rows.

The UI uses `usePaginatedQuery` with `initialNumItems: 20` and `loadMore(20)`.

Shared writer: `recordChange` in `convex/lib/changes.ts`, called from the mutations above. It inserts one row or returns without inserting when an update has no field diffs. Diff helpers are plain functions and live next to it.

## Build checklist

1. **Schema:** Add the `changes` table and `by_subject_and_at` index in `convex/schema.ts`.
2. **Page size:** Add `CHANGES_PAGE_SIZE` in `convex/lib/pagination.ts`.
3. **Helper:** Add `convex/lib/changes.ts` with the diff, actor check, and `recordChange` insert. Add `convex/lib/changes.test.ts` for field diffs, exclusion, no-op, and actor kind.
4. **Query:** Add `convex/changes.ts` with `listForAppUser` (args, returns, auth, index, actor labels, field labels).
5. **Writers:** Call `recordChange` from `insertCreatedUser`, `patchUserDetailInternal`, `deleteUser`, `setRoles`, `upsertUserFromProfile` (insert), and `patchAuthProfile` (email only). Thread the signed-in actor from `createUser` and `updateUser` into those internal mutations. Add optional `actorUserId` to `setRoles`.
6. **Tests:** Extend `convex/users.test.ts` (or the changes test) for create, no-op update, email update, delete, sign-in email, sign-in token-only, first provision insert, `setRoles` system, and `setRoles` with an actor. Assert the user write and the Change commit in the same mutation.
7. **User detail:** Render the Changes block in `components/user-detail.tsx` with the test ids, empty copy, row contents, and **Load older**.
8. **E2E:** Add `tests/e2e/changes.spec.ts` for scenarios **X** and **Y**. Register it in `playwright.config.ts` next to `user-lifecycle.spec.ts` (the authenticated project `testMatch`, and the same serial/grep list if that file lists specs explicitly).
9. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, then `pnpm test:e2e`.
10. **Convex deploy:** A human runs `pnpm convex:dev` (or equivalent) against the shared deployment so live functions match source. Do not run production `npx convex deploy` unattended.

## Acceptance criteria

- [ ] Product: Create User, first sign-in insert, Edit User, Profile, email-changing sign-in, Delete user, and `setRoles` record the Change described above; excluded fields and no-op writes record nothing; User detail shows Changes under the fields and above Delete, newest first, 20 then **Load older**; actor labels follow Who; a deleted App user still has no User detail page
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] E2E: **X** and **Y** in `tests/e2e/changes.spec.ts`; User detail **K–O**, Create User **P–S**, Delete user **T–V**, and lifecycle **W** still pass; bar = `pnpm test:e2e`

### E2E X — Edit User leaves an update on User detail

Signed in as the e2e super admin. Open an existing App user’s Edit User page, change first name to a new value, Save. On User detail, `user-detail-changes` shows a row whose action is Update, whose actor text is the signed-in person’s current name, and which shows First name from the previous value to the new value. `user-detail-changes-load-older` is absent when that is the only row.

### E2E Y — Create User leaves a create on User detail

Create User with a unique email and a first name. Open that User detail. Changes shows a Create row and does not show an Email field pair. The actor text is the signed-in person’s current name.

## Open / deferred

- [RAD-136](https://linear.app/radi-dev/issue/RAD-136/relational-roles-and-who-may-assign-them) — when a signed-in App user assigns roles, that write passes `actorUserId`. Do not build the editor here.
- [RAD-70](https://linear.app/radi-dev/issue/RAD-70/restrict-users-list-read-to-super-admin-manager) — Changes stay “any signed-in JWT” until User detail’s gate changes. Do not add a second gate.
- A screen where an admin opens a deleted App user and reads Changes. Do not weaken `getById` or the Users list filter in this build.
- Another resource’s exclusion list and detail page. Do not add a second `resourceKind` in this build.
- User activity. Do not record sign-in itself, only a tracked-field write caused by that action.
- Pagination of 21+ rows is a Convex test, not an e2e. Do not seed 21 users in Playwright to reach **Load older**.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-161/wayfinder-changes-handoff
- Children: none
- Glossary: `CONTEXT.md`
- Contract: `docs/handoffs/CONTRACT.md`
