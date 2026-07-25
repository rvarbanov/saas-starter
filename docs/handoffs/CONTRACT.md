# Wayfinder handoff contract

This document is the durable **format and home** for packed Wayfinder handoffs in this repo. It was locked by [RAD-68](https://linear.app/radi-dev/issue/RAD-68/handoff-spec-format-and-home).

A **packed** handoff is the assemble step’s output: grilled decisions compiled into one markdown file a later build agent can execute without re-grilling.

## Home (hybrid pointer)

- **Canonical artifact:** a markdown file under `docs/handoffs/`.
- **Naming:** `docs/handoffs/<destination-kebab>.md` (destination-named, not Linear id). Example for the authenticated shell map: `docs/handoffs/authenticated-dashboard-shell.md`.
- **Linear:** the Wayfinder map and assemble task post a **resolution comment** that is only a pointer — not a second full copy:
  - path to the packed file
  - “destination met” (when true)
  - checklist of packed child issue IDs
- Build agents read the **repo file**. Linear is the grilling workspace and history.

## Required header (every packed handoff)

Before the sections below, include:

- **Title**
- **Map issue URL** (Wayfinder parent)
- **Packed date** (ISO date)
- **Status:** `packed` or `superseded`
- **Source children:** list of grilled issue IDs packed into this file

## Required sections

Every packed handoff must contain these sections, in order:

1. **Destination** — one paragraph: what “done” means for the later build
2. **Out of scope** — explicit non-goals
3. **Decisions** — one subsection per grilled child, with the locked choice (not the debate)
4. **Build checklist** — ordered, agent-executable steps
5. **Acceptance criteria** — how the build agent knows it’s finished
6. **Open / deferred** — intentional gaps, soft defaults, and Linear debt links
7. **Sources** — map + child issue URLs

### Decisions density

Each Decisions subsection is **outcome + contract**: the locked choice plus any API/route/component contracts the build needs (function names, validators, route lists, shadcn add lists, etc.) so the agent rarely opens Linear. Debate history stays on Linear.

When the same contracts already appear elsewhere (e.g. an epoch doc), **duplicate them into the handoff** so the build agent has one self-contained file. Do not require reading a second repo doc mid-build. Leave historical epoch docs unchanged unless a dedicated cleanup ticket says otherwise.

### Build checklist density

**File-oriented:** ordered steps naming concrete paths and commands where known (layouts, route files, `pnpm exec shadcn add …`, deletes/moves). Decisions hold contracts; the checklist holds sequence and touchpoints. Avoid pseudo-diffs and component trees beyond what Decisions already lock.

### Acceptance criteria (always)

Acceptance must include all of:

1. **Product behavior** — routes and UX match Decisions
2. **Repo quality gates** — `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass (CI `quality` bar)
3. **E2E** — Playwright coverage for every page and happy-path flow **touched by the build**

Concrete E2E cases for a given map are grilled in a dedicated Wayfinder child before assemble. Do not leave Acceptance as “E2E somehow.”

### Open / deferred

Material undecided items may land here **only** with explicit soft defaults or “do not invent” rules. Soft defaults are one-off content for that handoff (recorded at pack time), not standing rules in this CONTRACT, unless a later grill promotes them.

Example soft default used for the shell map (recorded when packing, not here as policy): preserve existing dashboard/settings/profile body copy inside the new content area unless a later grill says otherwise.

## Authority and re-pack

- After pack, the **handoff file wins** over Linear map summaries and child issue bodies.
- Changing a locked choice after pack requires a **new grill (or reopen) and re-pack**. Mark the old file `superseded` (or replace in place and note the re-pack in the map resolution comment). Silent Linear edits are not enough for a build to proceed.

## Assemble gate (this repo’s shell map)

For [RAD-59](https://linear.app/radi-dev/issue/RAD-59/wayfinder-authenticated-dashboard-shell-handoff) / [RAD-63](https://linear.app/radi-dev/issue/RAD-63/assemble-handoff-spec):

- Do **not** assemble until the shell **E2E expectations** grilling issue is **Done**.
- That grill’s scope: Playwright cases for shell routes under `/dashboard/*` **plus** public/auth chrome regression after the `(public)` route-group move — not the entire product surface (about, pricing, admin, etc.).

## Empty skeleton (copy for assemble)

```markdown
# <Destination title>

- **Map:** <Wayfinder map URL>
- **Packed:** <YYYY-MM-DD>
- **Status:** packed
- **Source children:** <IDs>

## Destination

<!-- one paragraph: what done means for the later build -->

## Out of scope

<!-- explicit non-goals -->

## Decisions

### <Child issue title> (<ID>)

<!-- outcome + contract -->

## Build checklist

1. <!-- file-oriented step -->

## Acceptance criteria

- [ ] Product: <!-- routes / UX from Decisions -->
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] E2E: <!-- concrete Playwright cases from the E2E grill -->

## Open / deferred

<!-- soft defaults and debt links; do not invent beyond these -->

## Sources

- Map: <URL>
- Children: <URLs>
```
