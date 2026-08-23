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
The account menu opened from the app’s Global header. It holds Profile, Settings, and Sign out.
_Avoid_: user menu, account dropdown

**Users list**:
The table of people on the Users page.
_Avoid_: Users directory, members, accounts, getMe, directory

**Listed user**:
The name, email, and dates shown for each person in the Users list — not their login identity.
_Avoid_: Directory DTO, DTO, user doc, profile

**Demo page**:
The Coming soon page — fake metrics and rows used to show the layout, not live product data.
_Avoid_: Coming soon pack, demo data, live metrics, dashboard widgets
