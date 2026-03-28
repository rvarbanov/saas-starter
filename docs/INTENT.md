## Intent

This repository exists to help a **human software engineer collaborating with an AI coding agent** go from **0 → production-ready SaaS application** with **minimal initial setup**, while preserving **high quality, strong security, and long-term maintainability**.

The core inspiration is to provide a **reusable, opinionated starting point** that already includes patterns and guardrails for **auth, basic CRUD, dashboards, admin tooling, and public-facing sections**, plus a **test-heavy workflow**, so new applications can be created quickly **without sacrificing robustness**.

---

## 5W + H

### What

A reusable application template for **SaaS-style web apps** that ships with a complete toolkit and patterns for:

- Auth and basic CRUD
- A **dashboard section** for signed-in users
- An **admin section** for operational and configuration tasks
- A **public section** for marketing/landing and unauthenticated flows
- Comprehensive automated testing (unit, integration, UI, E2E)  
- **SEO** for public/marketing content and **reproducible environments** (e.g. Docker-based local and CI workflows) so setup drift does not undermine quality—details in `SPECIFICATION.md` and `IMPLEMENTATION.md`

### Who

- **Primary:** A human software engineer using this repo as the starting point for new products.  
- **Partner:** An AI coding agent that can safely perform most implementation work within the constraints of this template.

### Why

- Reduce time and cognitive overhead required to get from idea to a production-ready app.  
- Save money and engineering effort by reusing a well-tested, well-documented foundation.  
- Enable AI agents to work with **minimal hand-holding** by providing clear patterns, tests, and constraints.

### Where

- Used as the **starting point for new SaaS applications**, and as the **base template** when cloning or bootstrapping new repos.  
- Designed for modern cloud deployment with **built-in CI/CD (continuous integration and continuous deployment)**; exact providers and stack choices are defined in the specification and implementation docs, not here.

### When

- At project creation time: to go from “blank repo” to “production-capable app” as fast as possible.  
- Throughout the product’s lifecycle: as the reference architecture and pattern library for ongoing features and maintenance.

### How (philosophically, not stack-specific)

- Prefer **simple over complex**: fewer, well-understood patterns and dependencies are favored over elaborate architectures.  
- Heavily rely on **automated tests** (unit, integration, UI, E2E) to protect against regressions and to give AI agents a reliable feedback loop.  
- Design for **multi-year maintainability**, not just quick prototypes.

---

## Goals & values

### Goals

1. **Fast 0 → production for SaaS apps**  
   The template should let an engineer and AI agent go from idea to a deployable, authenticated CRUD application with dashboard, admin, and public sections with minimal custom setup.

2. **Authentication and security as a default, not an afterthought**  
   Auth, authorization, and basic security practices should be part of the initial design and implementation, not bolted on later.

3. **High test coverage as a default, not an afterthought**  
   Every meaningful behavior should be covered by unit tests and at least basic E2E coverage, with **critical user flows always having at least one E2E test**.

4. **AI-friendly, low-friction development experience**  
   The codebase structure, documentation, and conventions should make it easy for AI agents to understand and extend the system with **minimal clarification once scope and constraints are clear**. Ambiguity, conflicts between docs, or unclear requirements still require **asking or escalating**—low friction does not mean guessing.

5. **Long-term evolution and maintainability**  
   The template should be built with the idea of **evolving over time**: patterns and dependencies must remain understandable, supportable, and evolvable over years.

### Values

- **Quality over speed**  
  When speed and robustness conflict, **quality, tests, and security win**. It is acceptable to ship later if it means shipping something stable, secure, and well-tested.

- **Simplicity over cleverness**  
  Prefer straightforward, well-known patterns over sophisticated but fragile abstractions. Simple > complex, unless complexity is clearly justified.

- **Predictability and consistency**  
  Similar problems should be solved in similar ways. This makes it easier for both humans and AI agents to navigate and modify the code.

- **Safety through tests**  
  Tests are the primary safety net. Code that cannot be reasonably tested should be treated with suspicion and refactored.

---

## Autonomy & escalation (intent-level)

### Autonomous decisions

Within the constraints of this template and its specification:

- The AI agent may **implement new features**, **refactor code**, and **add or update tests** as long as it follows existing patterns and does not violate the repository’s testing, security, and quality standards.
- The AI agent may **improve test coverage**, **strengthen existing tests**, and **add missing tests** without human approval, provided changes remain aligned with established tooling and conventions.
- The AI agent may **update documentation** to reflect code and test changes.

### Escalation and clarification

- The AI agent should **ask for clarification whenever it is not sure** about intent, requirements, or trade-offs, rather than guessing.  
- The AI agent must **escalate** (stop and request human input) when:
  - A change would significantly alter architecture or core patterns.  
  - It needs to introduce entirely new categories of tooling or infrastructure beyond what the specification allows.  
  - It detects conflicting instructions between intent, specification, and implementation.

---

## Misalignment prevention

- **Primary outcome**  
  New applications created from this repo are **maintainable, secure, well-tested, and easily deployable SaaS apps**, suitable for long-term evolution—not just prototypes or quick demos.

- **Risky optimizations** (to avoid)  
  - Implementing features quickly while **skipping or weakening tests**.  
  - Introducing **complex or trendy tools** that reduce clarity or maintainability, just to appear modern.  
  - Making large structural changes that **improve short-term speed** but undermine established patterns, documentation, or test reliability.

- **Guardrails (intent-level)**  
  - No feature is considered “done” without corresponding **unit tests and, where relevant, E2E coverage**, especially for critical flows in the dashboard, admin, or public sections.  
  - For **major features that create, update, or fetch persisted records**, E2E tests must cover at least the **happy path** for each of those operations (see `SPECIFICATION.md`).  
  - Prefer **simpler, well-documented solutions** over more powerful but obscure ones.  
  - Any major architectural or tooling shift requires **explicit human approval**.

- **Intent-check sentence**  
  On every significant change, the agent should be able to truthfully say:  
  **“This change makes it easier for a human and an AI to securely maintain and safely extend this application in the long term, not just to ship something quickly.”**

---

**Use:** Keep this `INTENT.md` as the high-level intent document. The **specification** defines concrete tools, versions, and repo layout; the **implementation** doc describes how to apply those choices in practice.

