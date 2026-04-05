# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the feature. The defaults below reflect the current project constitution.
-->

**Language/Version**: [TypeScript with strict mode on Node.js LTS or NEEDS CLARIFICATION]  
**Primary Dependencies**: [Express, React, better-sqlite3, worker_threads, or NEEDS CLARIFICATION]  
**Storage**: [SQLite via direct SQL with better-sqlite3, files, or N/A]  
**Testing**: [e.g., Vitest, Playwright, integration scripts, or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server with network reachability to monitored hosts or NEEDS CLARIFICATION]  
**Project Type**: [monolithic web application with Express + React or NEEDS CLARIFICATION]  
**Performance Goals**: [e.g., concurrent probes without blocking API responsiveness or NEEDS CLARIFICATION]  
**Constraints**: [strict TypeScript, no heavy ORM, avoid complex React state manager, probes off main thread, or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., monitored hosts, scan frequency, concurrent users, or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] All changed backend, frontend, and shared application code remains in
      TypeScript with explicit interfaces at layer boundaries.
- [ ] The design fits a single deployable monolith where Express serves the
      built React application in production.
- [ ] Persistence uses direct SQL with `better-sqlite3`, or any exception is
      documented in Complexity Tracking with a rejected simpler alternative.
- [ ] Probe execution is isolated from the Node.js main thread and includes
      timeout plus concurrency handling.
- [ ] Module boundaries stay explicit across data access, network worker or
      service logic, API routes, and frontend layers.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for the feature and expand it as needed. Keep the shape consistent with the
  project constitution unless a justified exception is recorded.
-->

```text
backend/
├── src/
│   ├── api/
│   ├── data/
│   ├── network/
│   ├── services/
│   └── types/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── types/
└── dist/                # Production build served by Express

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., introducing a non-TypeScript boundary] | [current need] | [why a typed adapter or stricter contract was insufficient] |
| [e.g., adding an ORM or external state library] | [specific problem] | [why direct SQL or local/context state was insufficient] |
