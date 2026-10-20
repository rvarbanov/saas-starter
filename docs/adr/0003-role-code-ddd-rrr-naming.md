# Role codes use `DDD_RRR` (domain + responsibility)

Role codes are a naming convention only: they do not set access level or imply
permission inheritance. Catalog Action → role allow-lists (see Access enforcement)
decide what a Role may do. Codes are uppercase, seven characters: a three-character
**domain**, an underscore, and a three-character **responsibility**.

## Responsibilities (reuse across domains)

| Responsibility | Suffix |
| --- | --- |
| Admin / Administrator | `ADM` |
| Manager | `MGR` |
| Viewer | `VWR` |
| Runner | `RUN` |
| Representative | `REP` |
| Analyst | `ANL` |

## Examples

| Description | Code |
| --- | --- |
| Fee Schedule Admin | `FSC_ADM` |
| Fee Schedule Viewer | `FSC_VWR` |
| Adjustment Manager | `ADJ_MGR` |
| Payment Remittance Viewer | `RMT_VWR` |
| Payer Order Manager | `PYO_MGR` |
| Provider Order Manager | `PVO_MGR` |
| Report Runner | `RPT_RUN` |
| Claims Representative | `CLM_REP` |

## Guidelines

- One documented, consistent three-character abbreviation per domain.
- Reuse responsibility suffixes consistently across domains.
- Descriptions in Title Case as `<Domain> <Responsibility>`.
- Keep codes unique. Clarify overlaps before naming (e.g. two Fee Schedule Viewer
  candidates, or ambiguous account-management abbreviations).
- Documented exceptions are allowed for foundational Roles and job-title personas
  that do not naturally fit domain/responsibility.

## Consequences

- New Roles follow `DDD_RRR` unless an explicit exception is recorded.
- Other pre-convention codes stay as-is until a **separate migration** updates
  storage, catalogs, tests, and labels. This ADR alone does not rename those.
- Access enforcement MVP 1 seed Role codes (not foundational exceptions):
  `SYS_ADM` (System admin), `USR_ADM` (Users admin), `USR_MGR` (Users manager),
  `USR_VWR` (Users viewer). Legacy map in that build: `super_admin` → `SYS_ADM`,
  `manager` → `USR_MGR`. Locked on
  [Expand Access enforcement Roles: System admin, Users viewer](https://linear.app/radi-dev/issue/RAD-181)
  (overturns the `super_admin` → `USR_ADM` line from
  [Foundational role codes vs DDD_RRR migration](https://linear.app/radi-dev/issue/RAD-179)).
- `SYS_ADM` is listed **explicitly** on every Role-gated Action allow-list (no
  silent wildcard). Profile Actions that use catalog sentinel `ANY` stay
  `ANY`-only.
- `team_member` remains a temporary stored exception until its cleanup ticket;
  it is not a Users catalog Role.
- Catalog sentinel `ANY` is not a Role code and is unchanged by this convention.
