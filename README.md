# Network Sonar

Network Sonar is a local connectivity monitor with an Express backend, a React/Vite dashboard, lightweight SQLite persistence, and live updates over Server-Sent Events (SSE). It is designed to run quietly in the background, sample connectivity on a fixed interval, and expose a local web UI for current status and recent history.

The current implementation records each probe as `ok` or `down`, and the UI can mark the latest snapshot as `stale` when no fresh events arrive within the configured window.

## Features

- Background monitoring on a configurable interval.
- Worker-thread probe execution so network checks stay off the request path.
- SQLite storage with retention-based cleanup.
- Live dashboard updates through SSE, without manual refresh.
- Timeline view for recent history with selectable time ranges.

## Tech Stack

- Backend: Node.js 22+, Express 5, better-sqlite3
- Frontend: React 19, Vite
- Language: TypeScript 5 with `strict` mode
- Testing: Vitest, Supertest, Testing Library

## Repository Layout

```text
backend/                 Express server, monitor scheduler, SQLite access
backend/src/api/         REST and SSE routes
backend/src/network/     Worker-thread monitor execution
backend/src/services/    Status, history, and event coordination
frontend/                React application and Vite config
frontend/src/components/ Dashboard UI building blocks
tests/                   unit, contract, and integration suites
specs/                   feature specs and planning artifacts
```

## Requirements

- Node.js 22 or newer
- A working `ping` binary available on the host system

## Quick Start

Install dependencies:

```bash
npm install
```

Run backend and frontend in development mode:

```bash
npm run dev
```

Default local URLs:

- Frontend dev server: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:4173`

Build for production and start the backend serving the compiled frontend:

```bash
npm run build
npm run start
```

## Available Commands

- `npm run dev`: start backend and frontend workspaces in parallel
- `npm run build`: build `frontend/dist` and `backend/dist`
- `npm run start`: run the compiled backend server
- `npm run lint`: run ESLint across the repo
- `npm run typecheck`: run strict TypeScript checks for backend, frontend, and tests
- `npm test`: run unit, contract, and integration suites
- `npm run test:unit`: run isolated unit tests
- `npm run test:contract`: verify HTTP and stream contracts
- `npm run test:integration`: run end-to-end integration coverage

## Configuration

Create a root `.env` file to override defaults:

```bash
PORT=4173
MONITOR_TARGET=1.1.1.1
MONITOR_INTERVAL_SECONDS=5
MONITOR_RETENTION_DAYS=30
MONITOR_DB_PATH=data/network-sonar.sqlite
MONITOR_STALE_AFTER_SECONDS=15
MONITOR_PING_TIMEOUT_MS=3000
MONITOR_PING_BINARY=ping
```

Notes:

- `MONITOR_DB_PATH` is resolved from the repository root.
- `MONITOR_STALE_AFTER_SECONDS` defaults to three times the monitor interval.
- In production, the backend serves the built frontend from `frontend/dist`.

## API Overview

- `GET /health`: simple liveness response with the current server timestamp
- `GET /api/v1/bootstrap?range=1h|6h|24h|7d|30d`: current snapshot plus initial history
- `GET /api/v1/history?from=<unix>&to=<unix>`: historical samples for a requested window
- `GET /api/v1/events`: SSE stream emitting `snapshot`, `sample`, and `heartbeat` events

## How It Works

1. The backend starts a scheduler and initializes the SQLite-backed repository.
2. Each cycle launches a worker thread that runs the external connectivity probe.
3. The resulting sample is persisted, current status is updated, and retention cleanup runs on schedule.
4. The dashboard bootstraps over REST, then stays current through the SSE stream.

## Validation

Use the full local validation flow before opening a pull request:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```
