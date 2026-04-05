# network-sonar Constitution

## Core Principles

### I. TypeScript End-to-End
All backend, frontend, and shared application code MUST be written in TypeScript
with strict compiler settings enabled. The `any` type is prohibited unless an
external library boundary makes it unavoidable; each exception MUST be isolated
behind a typed adapter and documented in the relevant plan or review. Data that
crosses API, worker, database, or UI boundaries MUST use explicit interfaces or
type aliases, with runtime validation when input enters the system from outside
the process.

Rationale: A single strict language across the stack keeps contracts explicit
and reduces integration drift.

### II. Monolithic Delivery
network-sonar MUST ship as a single deployable monolith. The Express backend
MUST own API delivery and MUST serve the built React static assets in
production. Feature plans and code changes MUST fit this single deployment
topology; introducing additional services, separate deployables, or distributed
contracts is prohibited unless the constitution is formally amended first.

Rationale: A monolith minimizes operational overhead and preserves delivery
speed for the current product scope.

### III. Simplicity Over Framework Weight
Persistence MUST use direct SQL through `better-sqlite3` inside dedicated data
access modules. Heavy ORMs, opaque query abstractions, and complex React state
managers MUST NOT be introduced unless a concrete limitation is documented, a
simpler alternative is evaluated, and the added complexity is explicitly
approved. New abstractions MUST exist only to isolate a real boundary or remove
meaningful duplication.

Rationale: Early framework weight slows iteration and makes a small monolith
harder to understand.

### IV. Non-Blocking Network Execution
Ping operations and any other network probes MUST execute outside the Node.js
main thread by using worker threads, child processes, or an equivalent isolated
execution model. API handlers and schedulers MUST treat probe execution as
asynchronous work and MUST define timeout, cancellation, and concurrency
behavior before implementation. No change may add probe logic that can block
request handling or degrade event-loop responsiveness.

Rationale: The core workload is network I/O, so responsiveness depends on
keeping probe execution away from the event loop that serves the application.

### V. Modular Clean Boundaries
Code MUST be organized with a clear separation between data access, network
worker logic, API routes or controllers, and frontend UI or services. Each
module MUST have a narrow responsibility, depend on explicit interfaces, and
avoid leaking framework details into unrelated layers. Clean Code, Clean
Architecture, and SOLID are applied here as practical rules for maintainable
boundaries, not as permission to add ceremonial abstractions.

Rationale: Clear module ownership keeps the monolith maintainable without
over-engineering it.

## Technical Guardrails

- The backend MUST be implemented with Express and remain the production entry
  point for both API traffic and static frontend delivery.
- SQLite accessed through `better-sqlite3` and direct SQL statements is the
  default persistence model for application data.
- Frontend state MUST default to local component state or lightweight React
  Context. Broader client-side state tooling requires written justification.
- Features that touch probe execution MUST define timeout, retry, and
  concurrency limits before coding begins.
- Dependencies MUST be chosen for concrete value to the current monolith and
  rejected when platform features or small utilities solve the problem cleanly.

## Delivery Workflow & Review Gates

- Every feature specification MUST identify affected data contracts, storage
  changes, API routes, worker behavior, and UI surfaces.
- Every implementation plan MUST pass a constitution check for strict
  TypeScript usage, monolith fit, direct SQL usage, non-blocking probe
  execution, and module boundary clarity.
- Every task list MUST break work into data access, worker or service logic,
  API, and frontend tasks whenever those layers are affected.
- Code review MUST reject unexplained `any`, blocking probe execution, hidden
  SQL abstractions, and cross-layer coupling that weakens maintainability.
- Before merge, changed areas MUST pass the applicable lint, typecheck, and
  verification steps defined by the feature plan.

## Governance

- This constitution overrides conflicting guidance in local plans, specs, task
  lists, and implementation habits.
- Amendments MUST include the proposed change, the impacted principles or
  sections, the rationale for the change, and the synchronized template updates
  in the same reviewable change set.
- Constitution versioning follows semantic versioning: MAJOR for incompatible
  principle or governance changes, MINOR for new principles or materially
  expanded guidance, and PATCH for clarifications that do not change meaning.
- Compliance review is mandatory during specification, planning, task
  generation, and pull request review. Work that violates the constitution MUST
  be corrected or blocked until an amendment is approved.

**Version**: 1.0.0 | **Ratified**: 2026-04-05 | **Last Amended**: 2026-04-05
