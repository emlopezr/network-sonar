---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, contracts/

**Tests**: Include lint and typecheck work whenever code changes. Feature-level
contract, integration, and unit tests remain optional unless the specification
or risk profile makes them necessary.

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

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create backend, frontend, and test directories per implementation plan
- [ ] T002 Initialize TypeScript configs with strict mode for backend and frontend
- [ ] T003 [P] Configure linting, formatting, and shared typecheck scripts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can
be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Define SQLite schema and direct SQL access modules in `backend/src/data/`
- [ ] T005 [P] Setup Express API shell and production static asset serving
- [ ] T006 [P] Create probe worker/runtime boundary that keeps network work off the Node.js main thread
- [ ] T007 Create shared TypeScript contracts for API and persisted data models
- [ ] T008 Configure error handling, logging, timeout policy, and concurrency limits
- [ ] T009 Setup environment and configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested or risk justifies)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Contract test for [endpoint] in `tests/contract/[name].test.ts`
- [ ] T011 [P] [US1] Integration test for [user journey] in `tests/integration/[name].test.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Define interfaces in `backend/src/types/[entity1].ts`
- [ ] T013 [P] [US1] Implement direct SQL access in `backend/src/data/[entity1]-repo.ts`
- [ ] T014 [US1] Implement worker or service logic in `backend/src/network/[feature].ts` or `backend/src/services/[service].ts`
- [ ] T015 [US1] Implement API route in `backend/src/api/[feature].ts`
- [ ] T016 [US1] Wire frontend service and page in `frontend/src/services/[feature].ts` and `frontend/src/pages/[Page].tsx`
- [ ] T017 [US1] Add validation, timeout handling, and user-visible error states

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested or risk justifies)

- [ ] T018 [P] [US2] Contract test for [endpoint] in `tests/contract/[name].test.ts`
- [ ] T019 [P] [US2] Integration test for [user journey] in `tests/integration/[name].test.ts`

### Implementation for User Story 2

- [ ] T020 [P] [US2] Define interfaces in `backend/src/types/[entity].ts`
- [ ] T021 [P] [US2] Implement direct SQL access in `backend/src/data/[entity]-repo.ts`
- [ ] T022 [US2] Implement worker or service logic in `backend/src/network/[feature].ts` or `backend/src/services/[service].ts`
- [ ] T023 [US2] Implement API and frontend integration in `backend/src/api/[feature].ts` and `frontend/src/pages/[Page].tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested or risk justifies)

- [ ] T024 [P] [US3] Contract test for [endpoint] in `tests/contract/[name].test.ts`
- [ ] T025 [P] [US3] Integration test for [user journey] in `tests/integration/[name].test.ts`

### Implementation for User Story 3

- [ ] T026 [P] [US3] Define interfaces in `backend/src/types/[entity].ts`
- [ ] T027 [P] [US3] Implement direct SQL access in `backend/src/data/[entity]-repo.ts`
- [ ] T028 [US3] Implement worker, API, and frontend changes for [feature]

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in `docs/` or feature quickstart artifacts
- [ ] TXXX Code cleanup and simplification across touched modules
- [ ] TXXX Performance validation for concurrent probe workloads and API responsiveness
- [ ] TXXX [P] Additional unit tests (if requested) in `tests/unit/`
- [ ] TXXX Security and input-validation hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 -> P2 -> P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1 or US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Types and data access before services or worker logic
- Worker or service logic before API routes
- API work before frontend integration when the story depends on new backend behavior
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Types and repository modules within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/[name].test.ts"
Task: "Integration test for [user journey] in tests/integration/[name].test.ts"

# Launch all model and data tasks for User Story 1 together:
Task: "Define interfaces in backend/src/types/[entity1].ts"
Task: "Implement direct SQL access in backend/src/data/[entity1]-repo.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo (MVP)
3. Add User Story 2 -> Test independently -> Deploy/Demo
4. Add User Story 3 -> Test independently -> Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Keep `any` out of generated code unless an external boundary requires a typed adapter
- Keep SQL in `backend/src/data/` and probe execution out of API handlers
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, heavyweight abstractions, and cross-story dependencies that break independence
