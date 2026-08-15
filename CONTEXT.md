# SaaS Starter

Glossary for the authenticated product surface. Implementation contracts live in `docs/handoffs/`; this file names the concepts only.

## Language

**Authenticated shell**:
The sidebar and slim top bar that wrap every `/dashboard/*` page.
_Avoid_: App chrome, admin shell

**Public chrome**:
The GlobalNav and GlobalFooter on marketing and auth pages.
_Avoid_: Marketing layout (as a synonym for auth pages)

**Users directory**:
The signed-in listing of `users` rows.
_Avoid_: Members, accounts, getMe

**Directory DTO**:
The safe user fields returned by `users.list` and `users.get`.
_Avoid_: User doc, profile

**Coming soon pack**:
A static mock dataset swapped in code, not at runtime.
_Avoid_: Dashboard widgets, live metrics
