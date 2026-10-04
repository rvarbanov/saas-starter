# App content area full width

- **Map:** https://linear.app/radi-dev/issue/RAD-154/wayfinder-app-content-area-full-width-handoff
- **Packed:** 2026-10-04
- **Status:** packed
- **Source children:** RAD-155, RAD-156, RAD-157

Language follows [`CONTEXT.md`](../../CONTEXT.md). The **Content area** is the page body inside the **App** frame. The public site and the **Auth workflow** are different surfaces and keep their own narrow classes.

## Destination

A later build session makes every App Content area use one shared class, `.content-area`, that spans the frame, including pages added later, and makes the Users list use that width so Email can take the leftover space and dates stay on one line. Horizontal scroll remains only when the Content area is narrower than the row’s 64rem floor. When this handoff’s Acceptance criteria pass, the Wayfinder map destination is met for the build. This packed file is decision-complete; it does not implement UI.

After pack, **this file wins** over Linear map summaries and child issue bodies.

## Out of scope

- Implementing the UI inside the Wayfinder map effort (plan-only; build is a later session)
- Column picker and column reorder
- A mobile redesign, or hiding Users list columns at any width
- Changing public-site or Auth workflow width (`.page-main-centered`, `.page-auth`)
- Re-packing [`docs/handoffs/user-edit.md`](./user-edit.md). That file still says pages own `page-main`. This handoff supersedes the class name in code only
- Screenshot snapshot comparisons
- An inner max-width on form pages (see Open / deferred)

## Decisions

### Shared App Content area class (RAD-155)

Define `.content-area` in `app/styles/layout.css`:

```css
.content-area {
  @apply flex min-h-full w-full flex-col gap-6 px-6 py-8;
}
```

That spans the frame: no `max-w-*`, no `mx-auto`. Children stack vertically, with 1.5rem between them (`gap-6`), 1.5rem inset on the left and right (`px-6`), 2rem above and below (`py-8`), and the wrapper is at least as tall as the frame (`min-h-full`).

Move every current App `page-main` wrapper onto `.content-area`, including loading, not-found, and error states:

- `app/dashboard/page.tsx`
- `app/dashboard/users/page.tsx`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/profile/page.tsx`
- `app/dashboard/coming-soon/page.tsx` — replace the inline `mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8` wrapper with `content-area`. Keep the heading, subtitle, and `ComingSoonDemo` inside it
- `components/user-detail.tsx` — every `user-detail-page` wrapper
- `components/create-user-form.tsx` — every `create-user-page` wrapper
- `components/edit-user.tsx` — every `edit-user-page` wrapper

The page shell owns the class, not `components/user-form.tsx`. Future App pages use `.content-area`.

Delete `.page-main` from `app/styles/layout.css` once nothing references it.

Leave these unchanged:

- `.page-main-centered` on the public landing page (`app/(public)/page.tsx`)
- `.page-auth` on sign-in and sign-up (`app/(public)/sign-in/page.tsx`, `app/(public)/sign-up/page.tsx`)

### Users list column budget (RAD-156)

The Users list table fills the Content area and does not grow with long text. Keep the six columns, in this order: First name, Last name, Email, Roles, Created at, Updated at. Keep the row link that opens User detail. Do not hide columns at any width.

`components/ui/table.tsx` already sets the table to `w-full` and wraps it in `overflow-x-auto`. Do not change that shared primitive. On the Users list `Table` only (`UsersTableShell` in `components/users-list.tsx`), add `table-fixed`. Leave the scroll wrapper in place. Remove `max-w-48` from every Users list cell, including the First name cell that holds the row link.

Put the width classes on both the header cell and the body cell. `truncate`, `title`, and `whitespace-nowrap` belong on the body cells.

- First name and Last name: `w-32`. Body: `truncate` and `title` with the full string. The First name cell keeps the overlay link.
- Roles: `w-40`. Body: `truncate` and `title` with the full roles label.
- Email: no width class, so it takes the leftover width. Body: `min-w-48`, `truncate`, and `title` with the address. A long address ellipsizes only when the leftover is still shorter than the address.
- Created at and Updated at: `w-52`. Body: `whitespace-nowrap`. No `truncate` and no `max-w-*`. Do not change `formatListedUserDate`.

Those floors sum to 64rem (1024px). Horizontal scroll appears only when the Content area is narrower than that. On a wider Content area the row stays inside the area and Email uses the extra space.

Skeleton rows and the empty-state cell stay as they are. They do not use `max-w-48` today.

### E2E expectations for content-width build (RAD-157)

Do not add screenshot snapshot comparisons.

**Signed-in spec.** New file `tests/e2e/content-width.spec.ts`. In `playwright.config.ts`, add it to the `authenticated` project’s `testMatch` and to the `chromium` project’s `testIgnore`, so it runs with stored auth and does not also run signed out.

Set the viewport with `page.setViewportSize` before each navigation.

At **1440×900**, each of these pages has exactly one `.content-area` and no `.page-main`:

- `/dashboard`
- `/dashboard/users`
- `/dashboard/coming-soon`
- `/dashboard/settings`
- `/dashboard/profile`
- `/dashboard/users/new`
- User detail: open the first row of the Users list (`tbody tr` first, its link), then assert on `user-detail-page`
- Edit User: from that User detail, follow the link named Edit, then assert on `edit-user-page`

On `/dashboard/users` at 1440×900:

- The table container (`[data-slot=table-container]` inside `users-directory-table`) does not scroll horizontally: `scrollWidth` is less than or equal to `clientWidth`.
- All six headers are visible: First name, Last name, Email, Roles, Created at, Updated at.
- The first row’s Created at cell (column index 4) is not cut off: its `scrollWidth` is less than or equal to its `clientWidth`.
- The first row’s Email cell (column index 2) is wider than its First name cell (column index 0).

At **1280×720** (the suite’s usual Desktop Chrome size), on `/dashboard/users`, that same table container does scroll horizontally (`scrollWidth` greater than `clientWidth`), and all six headers are still present. That window is narrower than the 64rem row once the 256px sidebar and the Content area’s 24px side padding are subtracted.

**Signed-out checks.** Extend `tests/e2e/auth.spec.ts`, which already opens these routes without stored auth:

- `/` keeps `main.page-main-centered` and has no `.content-area`.
- `/sign-in` keeps `main.page-auth` and has no `.content-area`.

## Build checklist

1. **Class:** Add `.content-area` to `app/styles/layout.css` with the utilities in **Shared App Content area class**. Delete `.page-main` after the call sites below move.
2. **App pages:** Replace `page-main` with `content-area` in `app/dashboard/page.tsx`, `app/dashboard/users/page.tsx`, `app/dashboard/settings/page.tsx`, `app/dashboard/profile/page.tsx`, `components/user-detail.tsx`, `components/create-user-form.tsx`, and `components/edit-user.tsx`.
3. **Coming soon:** In `app/dashboard/coming-soon/page.tsx`, replace the inline `max-w-6xl` wrapper with `content-area`.
4. **Users list:** In `components/users-list.tsx`, add `table-fixed` on the Users list `Table` only. Apply the column widths, truncation, and date nowrap from **Users list column budget**. Do not edit `components/ui/table.tsx`.
5. **E2E:** Add `tests/e2e/content-width.spec.ts` and the signed-out assertions in `tests/e2e/auth.spec.ts`. Register the new spec in `playwright.config.ts` as in **E2E expectations for content-width build**.
6. **Leave alone:** `.page-main-centered`, `.page-auth`, `components/user-form.tsx`, `docs/handoffs/user-edit.md`, and `formatListedUserDate`.
7. **Quality gates:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, then `pnpm test:e2e`.

## Acceptance criteria

- [ ] Product: every App page listed in **Shared App Content area class** uses `.content-area` and not `.page-main`; Coming soon is included; public landing and auth pages stay on their narrow classes; the Users list keeps six columns and the row link, gives Email the leftover width, keeps dates on one line, and scrolls horizontally only under the 64rem floor
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] E2E: `tests/e2e/content-width.spec.ts` at 1440×900 and 1280×720, plus the `/` and `/sign-in` class checks in `tests/e2e/auth.spec.ts`; existing App specs still pass; bar = `pnpm test:e2e`

## Open / deferred

- A narrower inner measure for a specific form page (Create User, Edit User, Profile, Settings, or User detail) is a later decision. Soft default: do not add one. Those pages use the full `.content-area` width.
- [`docs/handoffs/user-edit.md`](./user-edit.md) still says pages own `page-main`. Do not re-pack it here. In code, the page shell owns `.content-area`.
- [Users table: use available width (less truncation / no needless horizontal scroll)](https://linear.app/radi-dev/issue/RAD-107/users-table-use-available-width-less-truncation-no-needless-horizontal) is the seed product ticket. This file is the spec for that width work and for the shared class. Do not invent column picking, reordering, or a mobile layout from it.

## Sources

- Map: https://linear.app/radi-dev/issue/RAD-154/wayfinder-app-content-area-full-width-handoff
- Children: RAD-155, RAD-156, RAD-157
- Assemble: https://linear.app/radi-dev/issue/RAD-158/assemble-content-width-handoff
- Contract: `docs/handoffs/CONTRACT.md`
