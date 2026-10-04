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
_Avoid_: main, inset, page-main

**Avatar menu**:
The account menu. It opens from one control, in the app’s Global header. It holds Profile, Settings, and Sign out.
_Avoid_: user menu, account dropdown, sidebar account

**App user**:
The one person in the product, owned by the app, whether they arrived through Auth workflow sign-up or Create User. WorkOS manages sign-in for that same person, and a session matches its App user by the identity on the session, never by email. Names, roles, and other product data live on the App user; WorkOS holds the sign-in email only.
_Avoid_: Auth user, WorkOS user, Convex user, directory, directory user, product directory, member, User (when you mean this), Pending App user, Create User (the pathway, not the person)

**Create User**:
The manager pathway to create an App user from the Users list — email required; other editable fields optional. WorkOS sign-in is created for that same App user; invite / set-password email is a separate step. Pairs with Edit User (the two manager write pages).
_Avoid_: Invite user (as the name for this page), register, add member, Auth user, a different kind of user than App user

**Delete user**:
The Super admin pathway that marks an App user deleted without removing the record. A deleted App user is hidden from the Users list, and signing in again does not make them active.
_Avoid_: Hard delete, destroy, purge, remove user, deactivate, disable, archive, ban

**Visitor**:
Someone who is not signed in right now. They can only use the Public site. An App user who has signed out is a Visitor until they sign in again.
_Avoid_: anonymous user, guest, public user, Auth user

**Users list**:
The table of App users on the Users page.
_Avoid_: Users directory, members, accounts, getMe, directory

**Listed user**:
The name, email, and dates shown for an App user in the Users list.
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

**Action**:
The kind of Change: create, update, or delete.
_Avoid_: Event type, operation, verb

**Tracked field**:
A field of product data on a resource whose before and after an update Change records. Each resource names the fields left out of that before and after.
_Avoid_: Column, attribute, audit field

**Change**:
The saved record of one create, update, or delete of a resource’s product data: the action, the App user who did it (by id), and when. An update also keeps the before and after of each tracked field that differs; a create or delete does not.
_Avoid_: Audit entry, audit log, activity, event

**Changes**:
The list of Change records for one resource, on that resource’s detail page, visible to whoever can see that page. For an App user, the detail page is User detail.
_Avoid_: Change audit log, activity log, history
