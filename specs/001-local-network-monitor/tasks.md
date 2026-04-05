# Tasks: Monitor de conectividad local

**Input**: Design documents from `/specs/001-local-network-monitor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, contracts/

**Tests**: Include lint, typecheck, contract, integration, and targeted unit
tests because this feature combines worker scheduling, SQLite persistence,
REST/SSE contracts, and a real-time UI.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monolithic web app**: `backend/src/`, `frontend/src/`, `tests/`
- **Data access**: `backend/src/data/`
- **Network workers/services**: `backend/src/network/` and `backend/src/services/`
- **HTTP surface**: `backend/src/api/`
- **Frontend UI/services**: `frontend/src/components/`, `frontend/src/pages/`,
  `frontend/src/services/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared workspace structure

- [ ] T001 Create the root workspace manifests in `package.json`, `tsconfig.base.json`, and `eslint.config.js`
- [ ] T002 [P] Create backend package scaffolding in `backend/package.json`, `backend/tsconfig.json`, and `backend/src/server.ts`
- [ ] T003 [P] Create frontend package scaffolding in `frontend/package.json`, `frontend/tsconfig.json`, `frontend/index.html`, and `frontend/src/main.tsx`
- [ ] T004 [P] Create test runner scaffolding in `tests/contract/.gitkeep`, `tests/integration/.gitkeep`, and `tests/unit/.gitkeep`
- [ ] T005 Configure root scripts for `dev`, `build`, `start`, `lint`, and `typecheck` in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define shared monitor, storage, and API interfaces in `backend/src/types/monitor.ts`, `backend/src/types/storage.ts`, `backend/src/types/api.ts`, and `frontend/src/types/monitor.ts`
- [ ] T007 Implement SQLite bootstrap and migration loading in `backend/src/data/db.ts` and `backend/src/data/migrations/001_init.sql`
- [ ] T008 Implement the connection log repository and purge service in `backend/src/data/connection-log-repository.ts` and `backend/src/data/purge-service.ts`
- [ ] T009 [P] Implement environment and runtime configuration loading in `backend/src/config.ts` and `backend/src/types/env.d.ts`
- [ ] T010 [P] Implement the typed event bus and shared monitor orchestration service in `backend/src/services/event-bus.ts` and `backend/src/services/monitor-service.ts`
- [ ] T011 [P] Implement the OS gateway resolution adapter in `backend/src/network/gateway-resolver.ts`
- [ ] T012 [P] Implement the ping command adapter using `node:child_process` in `backend/src/network/ping-command.ts`
- [ ] T013 Implement the worker-thread execution boundary in `backend/src/network/monitor-worker.ts` and `backend/src/network/worker-entry.ts`
- [ ] T014 Implement the 5-second scheduler, timeout policy, and hourly purge trigger in `backend/src/network/monitor-scheduler.ts`
- [ ] T015 Implement the Express app shell, health route, and production static serving in `backend/src/app.ts`, `backend/src/api/routes/health.ts`, and `backend/src/server.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - Ver estado actual en vivo (Priority: P1) MVP

**Goal**: Mostrar el estado actual de la conexión en tiempo real sin recargar la
página.

**Independent Test**: Con el monitor corriendo, abrir la interfaz local y
verificar que el estado actual aparece en la carga inicial y cambia solo con SSE
cuando la conectividad pasa entre `ok`, `global_down` y `local_down`.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Add bootstrap API contract test for `GET /api/v1/bootstrap` in `tests/contract/bootstrap.contract.test.ts`
- [ ] T017 [P] [US1] Add SSE contract test for `GET /api/v1/events` in `tests/contract/events.contract.test.ts`
- [ ] T018 [P] [US1] Add integration test for live status transitions in `tests/integration/live-status.integration.test.ts`

### Implementation for User Story 1

- [ ] T019 [P] [US1] Implement current snapshot derivation and staleness rules in `backend/src/services/current-status-service.ts`
- [ ] T020 [US1] Implement the bootstrap route in `backend/src/api/routes/bootstrap.ts`
- [ ] T021 [US1] Implement the SSE stream endpoint with `snapshot` and `heartbeat` events in `backend/src/api/sse/status-stream.ts`
- [ ] T022 [US1] Wire monitor events into the Express app in `backend/src/app.ts`
- [ ] T023 [P] [US1] Implement the frontend bootstrap client and EventSource adapter in `frontend/src/services/api-client.ts` and `frontend/src/services/status-stream.ts`
- [ ] T024 [P] [US1] Implement current status UI components in `frontend/src/components/status-card.tsx` and `frontend/src/components/connection-badge.tsx`
- [ ] T025 [US1] Compose the live dashboard page in `frontend/src/pages/dashboard.tsx` and `frontend/src/app.tsx`
- [ ] T026 [US1] Add frontend stale-state and stream-reconnect handling in `frontend/src/pages/dashboard.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - Distinguir el tipo de caída (Priority: P2)

**Goal**: Clasificar cada incidente como caída global o caída local con detalle
diagnóstico suficiente para que el usuario sepa dónde intervenir.

**Independent Test**: Simular una caída externa con la gateway disponible y una
caída local con ambas sondas fallando; verificar persistencia, clasificación,
snapshot y payload SSE correctos.

### Tests for User Story 2

- [ ] T027 [P] [US2] Add unit tests for classification logic in `tests/unit/monitor-classification.test.ts`
- [ ] T028 [P] [US2] Add integration test for external-vs-local outage persistence in `tests/integration/outage-classification.integration.test.ts`

### Implementation for User Story 2

- [ ] T029 [P] [US2] Implement cycle classification and failure-reason mapping in `backend/src/services/monitor-cycle-service.ts`
- [ ] T030 [US2] Persist gateway and latency diagnostics through `backend/src/data/connection-log-repository.ts`
- [ ] T031 [US2] Update worker execution to run external ping first and conditional gateway ping second in `backend/src/network/monitor-worker.ts`
- [ ] T032 [US2] Implement gateway fallback resolution and configuration override handling in `backend/src/network/gateway-resolver.ts`
- [ ] T033 [US2] Emit `sample` SSE events with diagnostic fields in `backend/src/api/sse/status-stream.ts`
- [ ] T034 [US2] Show provider-vs-local diagnosis text and last failure reason in `frontend/src/components/status-card.tsx` and `frontend/src/pages/dashboard.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 5: User Story 3 - Revisar el historial visual (Priority: P3)

**Goal**: Mostrar un historial visual coloreado y actualizado en vivo para
detectar patrones de inestabilidad.

**Independent Test**: Poblar muestras históricas con distintos estados, abrir la
vista y comprobar que el heatmap o timeline representa correctamente el rango
inicial y añade nuevas muestras sin recargar.

### Tests for User Story 3

- [ ] T035 [P] [US3] Add history API contract test for `GET /api/v1/history` in `tests/contract/history.contract.test.ts`
- [ ] T036 [P] [US3] Add integration test for history bucketing and retention window in `tests/integration/history-window.integration.test.ts`
- [ ] T037 [P] [US3] Add UI integration test for timeline updates in `tests/integration/history-timeline.integration.test.ts`

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement history bucket queries and range filtering in `backend/src/services/history-service.ts`
- [ ] T039 [US3] Implement the history route in `backend/src/api/routes/history.ts`
- [ ] T040 [US3] Emit `history-append` SSE events for new persisted samples in `backend/src/api/sse/status-stream.ts`
- [ ] T041 [P] [US3] Implement the timeline heatmap and legend components in `frontend/src/components/timeline-heatmap.tsx` and `frontend/src/components/legend.tsx`
- [ ] T042 [US3] Integrate historical range loading and incremental updates in `frontend/src/pages/dashboard.tsx`
- [ ] T043 [US3] Add server-side bucket selection and history query parsing in `backend/src/api/routes/bootstrap.ts` and `backend/src/api/routes/history.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T044 [P] Add end-to-end smoke coverage for bootstrap, SSE, and history flows in `tests/integration/quickstart-smoke.integration.test.ts`
- [ ] T045 Validate the 30-day retention purge and startup purge behavior in `tests/integration/purge-policy.integration.test.ts`
- [ ] T046 [P] Finalize Vite production build and backend static asset serving in `frontend/vite.config.ts`, `backend/src/app.ts`, and `backend/package.json`
- [ ] T047 [P] Document runtime configuration and local verification steps in `README.md` and `specs/001-local-network-monitor/quickstart.md`
- [ ] T048 Run lint, typecheck, contract, integration, and build validation through `package.json` scripts and fix any remaining issues in `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and reuses the live-status pipeline from US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from the persisted samples delivered by US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - delivers the MVP
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) but is easiest after US1 because it enriches the live-state flow with diagnosis
- **User Story 3 (P3)**: Can start after Foundational (Phase 2), but depends on persisted and classified samples to render valuable history

### Within Each User Story

- Contract and integration tests MUST be written and fail before implementation
- Backend domain logic before API exposure
- API exposure before frontend integration
- UI wiring before story validation
- Story complete before moving to next priority

### Parallel Opportunities

- `T002`, `T003`, and `T004` can run in parallel after `T001`
- `T009`, `T011`, and `T012` can run in parallel once shared types and DB shape are defined
- `T016`, `T017`, and `T018` can run in parallel inside US1
- `T023` and `T024` can run in parallel after US1 backend contracts are stable
- `T027` and `T028` can run in parallel inside US2
- `T035`, `T036`, and `T037` can run in parallel inside US3
- `T046` and `T047` can run in parallel in the polish phase

---

## Parallel Example: User Story 1

```bash
# Launch US1 test tasks together:
Task: "Add bootstrap API contract test in tests/contract/bootstrap.contract.test.ts"
Task: "Add SSE contract test in tests/contract/events.contract.test.ts"
Task: "Add integration test for live status transitions in tests/integration/live-status.integration.test.ts"

# Launch US1 frontend implementation tasks together after backend contracts stabilize:
Task: "Implement frontend bootstrap client and EventSource adapter in frontend/src/services/api-client.ts and frontend/src/services/status-stream.ts"
Task: "Implement current status UI components in frontend/src/components/status-card.tsx and frontend/src/components/connection-badge.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch US2 verification tasks together:
Task: "Add unit tests for classification logic in tests/unit/monitor-classification.test.ts"
Task: "Add integration test for external-vs-local outage persistence in tests/integration/outage-classification.integration.test.ts"

# Launch independent backend tasks together:
Task: "Implement cycle classification and failure-reason mapping in backend/src/services/monitor-cycle-service.ts"
Task: "Implement gateway fallback resolution and configuration override handling in backend/src/network/gateway-resolver.ts"
```

## Parallel Example: User Story 3

```bash
# Launch US3 test tasks together:
Task: "Add history API contract test in tests/contract/history.contract.test.ts"
Task: "Add integration test for history bucketing and retention window in tests/integration/history-window.integration.test.ts"
Task: "Add UI integration test for timeline updates in tests/integration/history-timeline.integration.test.ts"

# Launch US3 UI tasks together:
Task: "Implement the timeline heatmap and legend components in frontend/src/components/timeline-heatmap.tsx and frontend/src/components/legend.tsx"
Task: "Integrate historical range loading and incremental updates in frontend/src/pages/dashboard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify `/api/v1/bootstrap`, `/api/v1/events`, and the
   live dashboard independently
5. Demo the headless monitor with live state only

### Incremental Delivery

1. Complete Setup + Foundational -> foundation ready
2. Add User Story 1 -> test independently -> deliver MVP
3. Add User Story 2 -> test independently -> deliver diagnosis improvements
4. Add User Story 3 -> test independently -> deliver historical visibility
5. Finish with polish, validation, and documentation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 backend/API and SSE
   - Developer B: US1 frontend and later US3 visualization
   - Developer C: US2 classification and persistence diagnostics
3. Merge stories in priority order and keep contract tests green

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Every task includes a concrete file path and is executable without extra context
- MVP scope is Phase 1 + Phase 2 + Phase 3
- Keep SQL in `backend/src/data/` and all ping execution outside API handlers
- Keep React state lightweight; prefer page state plus small service adapters
- Avoid introducing extra services, WebSockets, ORMs, or heavy ping libraries
