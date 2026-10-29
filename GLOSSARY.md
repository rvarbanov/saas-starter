# SaaS Starter

Glossary for the public site and the signed-in app. Implementation contracts live in `docs/handoffs/`; this file names the concepts only.

## Surfaces

The kinds of pages someone can be on: public site, app, landing pages, and the auth workflow.

**Public site**:
The part of the product anyone can browse without signing in.
_Avoid_: The website, public chrome, marketing layout

**App**:
The signed-in web app — the product itself, every page behind auth.
_Avoid_: Authenticated shell, app chrome, admin shell, the website

**Landing page**:
A public marketing page that explains the product and drives a sign-up or sign-in click.
_Avoid_: Public site (the landing pages are only the marketing ones)

**Auth workflow**:
The public steps that get someone into the app: sign-in, sign-up, and password reset.
_Avoid_: Login flow (as the only name), auth chrome

## Frame

The header, footer, and nav that stay on screen while the page content changes. Public site and app each have all three.

**Global header**:
The bar at the top of the page.
_Avoid_: Chrome, top bar (as the only name)

**Global footer**:
The bar at the bottom of the page. The public site and the app each have one.
_Avoid_: Chrome

**Global nav**:
The persistent links used to move around.
_Avoid_: Chrome, sidebar (as the only name)

## In the app

**Content area**:
The page body inside the app’s frame — the part that changes as you move between app pages.
_Avoid_: main, inset, page-main, internal shell

**Avatar menu**:
The account menu. It opens from one control, in the app’s Global header. It holds Profile, Settings, and Sign out.
_Avoid_: user menu, account dropdown, sidebar account

**App user**:
The one person in the product, owned by the app, whether they arrived through Auth workflow sign-up or Create User. WorkOS manages sign-in for that same person, and a session matches its App user by the identity on the session, never by email. First name, last name, roles, and other product data live on the App user; WorkOS holds the sign-in email only.
_Avoid_: Auth user, WorkOS user, Convex user, directory, directory user, product directory, member, User (when you mean this), Pending App user, Create User (the pathway, not the person)

**First name**:
The App user's given name. Optional.
_Avoid_: Name, user name

**Last name**:
The App user's family name. Optional.
_Avoid_: Name, user name

**Create User**:
The Users manager, Users admin, or System admin pathway to create an App user from the Users list — email required; other editable fields optional. WorkOS sign-in is created for that same App user; invite / set-password email is a separate step. Pairs with Edit User (the two manager write pages).
_Avoid_: Invite user (as the name for this page), register, add member, Auth user, a different kind of user than App user

**Delete user**:
The Users admin or System admin pathway that marks an App user deleted without removing the record. A deleted App user is hidden from the Users list, and signing in again does not make them active. An App user who still holds System admin (`SYS_ADM`) cannot be deleted until that Role is removed first (ops / internal seed path in Access enforcement MVP 1).
_Avoid_: Hard delete, destroy, purge, remove user, deactivate, disable, archive, ban, Super admin pathway (legacy label), Administrator pathway (legacy label)

**Domain** (Role naming):
The product area a Role belongs to — the three-letter prefix in a Role code (`USR`, `FSC`, `SYS`, and so on). Not an org unit or tenant.
_Avoid_: Team, organization, scope (when you mean this), permission domain

**Domain admin**:
The Admin responsibility for one Domain — Role code suffix `ADM`. A naming pattern only; which Actions it holds come from that Domain’s catalog, not from the suffix.
_Avoid_: Users admin (when you mean a non-Users Domain admin), System admin, Super admin, admin (alone), treating `ADM` as an access level

**Domain manager**:
The Manager responsibility for one Domain — Role code suffix `MGR`. A naming pattern only; which Actions it holds come from that Domain’s catalog, not from the suffix.
_Avoid_: Manager (alone), team manager, Users manager (when you mean a non-Users Domain manager), treating `MGR` as an access level

**Domain viewer**:
The Viewer responsibility for one Domain — Role code suffix `VWR`. A naming pattern only; which Actions it holds come from that Domain’s catalog, not from the suffix.
_Avoid_: Viewer (alone), Users viewer (when you mean a non-Users Domain viewer), read-only user, team member (as this responsibility), treating `VWR` as an access level

**System admin**:
The cross-Domain admin — Role code `SYS_ADM`. Holds every Action the catalog lists for it (expected: all Actions across Domains). Listed explicitly on each Action allow-list; not a silent wildcard. Successor to the legacy Super admin / `super_admin` seed.
_Avoid_: Super admin, super_admin, Administrator, Users admin, admin (alone), god mode (as a product term), treating `SYS` as a tenant

**Users admin**:
The Users Domain admin — Role code `USR_ADM`. Holds every Users Domain Action when that Action lists `USR_ADM` (including Delete user and Changes read). A Domain-scoped admin subset of what System admin can do; not cross-Domain. Cannot remove `SYS_ADM` from another App user.
_Avoid_: Administrator, Super admin, System admin, admin (as the Role name), ADM, Domain admin (when you mean this specific Role)

**Users manager**:
The Users Domain manager — Role code `USR_MGR`. Holds Users Domain Actions `list`, `read`, `create`, `update`, and `changes.read` when those Actions list `USR_MGR`. Cannot Delete user.
_Avoid_: User manager, Manager, manager, team manager, UMG, ADM, Domain manager (when you mean this specific Role)

**Users viewer**:
The Users Domain viewer — Role code `USR_VWR`. Holds `users.list` and `users.read` only. Cannot create, update, or delete Users, and cannot read Changes on User detail.
_Avoid_: Viewer (alone), team member (as this Role), read-only user, Domain viewer (when you mean this specific Role)

**Role code**:
The string stored on the App user’s `roles` array. New Roles follow `DDD_RRR` (Domain + responsibility) per `docs/adr/0003-role-code-ddd-rrr-naming.md` — Domain admin (`*_ADM`), Domain manager (`*_MGR`), Domain viewer (`*_VWR`), and other responsibilities in that ADR. Access enforcement MVP 1 seed Roles: `SYS_ADM` (System admin), `USR_ADM` (Users admin), `USR_MGR` (Users manager), `USR_VWR` (Users viewer). Legacy map: `super_admin` → `SYS_ADM`, `manager` → `USR_MGR`. The UI shows the Role description, not the code alone.
_Avoid_: Role slug as the only name, permission, capability, treating the code as an access level, ADM, UMG

**Role**:
A named set of Actions an App user may hold, identified by its Role code on the App user’s `roles` array. In Access enforcement MVP 1 the seed Roles are System admin, Users admin, Users manager, and Users viewer; the catalog maps each Action to Role codes (or ANY). Not a separate grant table yet.
_Avoid_: Permission, capability, grant (as this concept), ACL

**Action**:
A code-defined allow-or-deny check in the access catalog, named as a Domain plus a verb (for example `users` + `delete`, consulted as `can({ domain, action })`). Distinct from Change kind.
_Avoid_: Permission, capability, grant, privilege, Change kind (when you mean this)

**ANY**:
The catalog sentinel that means every provisioned App user. Used on Profile Actions such as `self.read` / `self.write`. Not a Role code and not stored on the App user’s `roles` array.
_Avoid_: Wildcard role, everyone role, public, anonymous, storing ANY on `roles`

**Visitor**:
Someone who is not signed in right now. They can only use the Public site. An App user who has signed out is a Visitor until they sign in again.
_Avoid_: anonymous user, guest, public user, Auth user

**Users list**:
The table of App users on the Users page.
_Avoid_: Users directory, members, accounts, getMe, directory

**Listed user**:
The first name, last name, email, and dates shown for an App user in the Users list.
_Avoid_: Directory DTO, DTO, user doc, profile, Auth user

**User detail**:
The app page that shows one App user, opened from the Users list (manager path). Distinct from Edit User and from Profile (self, Avatar menu).
_Avoid_: User profile, profile page (when you mean this), App user page, details, view page, show, edit mode (when you mean Edit User)

**Edit User**:
The manager page for changing one App user’s editable fields. Distinct from User detail and from Profile. Pairs with Create User (the two manager write pages).
_Avoid_: User edit, edit mode, in-place edit, user detail edit, details, show

**Profile**:
The signed-in person’s own account page in the app, reached from the Avatar menu — not User detail and not Edit User.
_Avoid_: User detail, Edit User, settings (Settings is a different page)

**Demo page**:
The Coming soon page — fake metrics and rows used to show the layout, not live product data.
_Avoid_: Coming soon pack, demo data, live metrics, dashboard widgets

## Changes

**Change kind**:
Whether a Change is a create, update, or delete.
_Avoid_: Action (when you mean this — Action is the access-catalog term), Event type, operation, verb

**Tracked field**:
A field of product data on a resource whose before and after an update Change records. Each resource names the fields left out of that before and after.
_Avoid_: Column, attribute, audit field

**System**:
The actor on a Change when a process outside any user action changes a resource. A future Role code `SYS_SYS` may name this actor explicitly; deferred past Access enforcement MVP 1.
_Avoid_: Admin, script, dashboard user, bot, SYS_ADM (when you mean the automated Change actor)

**Change**:
The saved record of one create, update, or delete of a resource’s product data: the Change kind, who caused it, and when. Who is the App user when a user action caused the write, and the system when a process outside any user action caused it; an update also keeps the before and after of each tracked field that differs.
_Avoid_: Audit entry, audit log, activity, event

**Changes**:
The list of Change records for one resource, on that resource’s detail page, visible to whoever can see that page. For an App user, the detail page is User detail.
_Avoid_: Change audit log, activity log, history
