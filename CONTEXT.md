# SaaS Starter

Glossary for the public website and the signed-in product. Implementation contracts live in `docs/handoffs/`; this file names the concepts only.

## Language

**The app**:
The signed-in product — every page under `/dashboard`, including the sidebar and top bar that stay on screen.
_Avoid_: Authenticated shell, app chrome, admin shell

**The website**:
The public site — home, sign-in, and sign-up — with the site header and footer.
_Avoid_: Public chrome, marketing layout, chrome

**Users list**:
The table of people on the Users page.
_Avoid_: Users directory, members, accounts, getMe, directory

**Listed user**:
The name, email, and dates shown for each person in the Users list — not their login identity.
_Avoid_: Directory DTO, DTO, user doc, profile

**Demo data**:
Fake metrics and rows on the Coming soon page, used to show the layout. Swapped in code, not live.
_Avoid_: Coming soon pack, live metrics, dashboard widgets
