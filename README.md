# Network Sonar

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**Self-hosted network connectivity monitor with a live dashboard, outage history, and provider-aware failover controls.**

Network Sonar is a local-first monitoring tool for continuously probing external targets, storing each sample in SQLite, and exposing a real-time web interface over an Express + React stack. It is built for quiet background monitoring on a single machine or home lab host, with Docker as the primary deployment path.

## Why Network Sonar?

- **Local-first by default**: binds to `127.0.0.1` in the default Docker setup, so it is not exposed to your LAN unless you opt in.
- **Live operational view**: the dashboard updates through Server-Sent Events instead of polling.
- **Provider-aware monitoring**: track multiple upstream DNS or network providers, enable round-robin probing, and manage custom targets from the UI.
- **Useful incident history**: raw samples are grouped into outage incidents so you can inspect downtime instead of reading every ping.
- **Low-overhead persistence**: SQLite keeps deployment simple while still retaining history and settings.

## Features

- **Current status + stale detection** for active, stale, and no-data states
- **Timeline heatmap** with `1h`, `6h`, `24h`, `7d`, and `30d` ranges
- **Incident history** with grouped outages, durations, and resolved vs ongoing state
- **Provider catalog** for Cloudflare, Google, Quad9, and OpenDNS targets
- **Custom providers** with optional hosted logos
- **Round-robin mode** to cycle through enabled providers
- **Sensitivity controls** to confirm down/up states after multiple samples
- **Runtime controls** to pause or resume monitoring without stopping the app
- **Retention-based cleanup** for long-running installs

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose support
- A working `ping` binary on the host if you plan to run the app outside Docker

### Option A: Published Container

Run the latest image from [GHCR](https://ghcr.io/emlopezr/network-sonar):

```bash
docker run -d \
  --name network-sonar \
  -p 127.0.0.1:4044:4044 \
  -e HOST=0.0.0.0 \
  -e PORT=4044 \
  -e MONITOR_DB_PATH=/data/network-sonar.sqlite \
  -v network-sonar-data:/data \
  --tmpfs /tmp \
  --cap-drop ALL \
  --cap-add NET_RAW \
  --security-opt no-new-privileges:true \
  ghcr.io/emlopezr/network-sonar:latest
```

Open **[http://127.0.0.1:4044](http://127.0.0.1:4044)**.

### Option B: Source + Docker Compose

This is the best path if you want the helper script, local config file, and an easier update flow.

```bash
git clone https://github.com/emlopezr/network-sonar.git
cd network-sonar
cp .env.example .env
./sonar.sh start
```

Open **[http://127.0.0.1:4044](http://127.0.0.1:4044)**.

Useful helper commands:

```bash
./sonar.sh logs
./sonar.sh status
./sonar.sh stop
./sonar.sh down
./sonar.sh update
```

## Configuration

Copy `.env.example` to `.env` and adjust what you need. These are the main runtime variables:


| Variable                        | Default                           | Description                                                           |
| ------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `HOST`                          | `127.0.0.1`                       | Backend bind host outside Docker                                      |
| `PORT`                          | `4044`                            | Backend port                                                          |
| `APP_PORT`                      | `4044`                            | Published host port in Docker Compose                                 |
| `DOCKER_PUBLISH_HOST`           | `127.0.0.1`                       | Docker bind host; change to `0.0.0.0` only if you want LAN exposure   |
| `MONITOR_TARGETS`               | `1.1.1.1,8.8.8.8,1.0.0.1,8.8.4.4` | Comma-separated probe targets                                         |
| `MONITOR_INTERVAL_SECONDS`      | `5`                               | Probe interval                                                        |
| `MONITOR_RETENTION_DAYS`        | `30`                              | History retention window                                              |
| `MONITOR_DB_PATH`               | `data/network-sonar.sqlite`       | SQLite file path                                                      |
| `MONITOR_STALE_AFTER_SECONDS`   | `30`                              | When current data should be marked stale                              |
| `MONITOR_NO_DATA_AFTER_SECONDS` | `30`                              | When the monitor should transition to no-data                         |
| `MONITOR_PING_TIMEOUT_MS`       | `3000`                            | Timeout for each ping cycle                                           |
| `MONITOR_PING_BINARY`           | `ping`                            | Ping executable name or path                                          |
| `MONITOR_ROUND_ROBIN_ENABLED`   | `false`                           | Cycle through enabled providers instead of using one fixed target set |
| `MONITOR_CONFIRM_DOWN_AFTER`    | `2`                               | Samples required before confirming down                               |
| `MONITOR_CONFIRM_UP_AFTER`      | `2`                               | Samples required before confirming recovery                           |


Notes:

- `MONITOR_TARGET` is still supported as a single-target fallback, but `MONITOR_TARGETS` is the primary configuration path.
- `MONITOR_DB_PATH` is resolved from the repository root when running outside Docker.
- Custom provider logos accept `https://` URLs, plus local-only `http://127.0.0.1` and `http://localhost`.

## Local Development

Install dependencies:

```bash
npm install
```

Start backend and frontend in development mode:

```bash
npm run dev
```

Default dev URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:4173`

Build and run the production bundle locally:

```bash
npm run build
npm run start
```

Default production URL:

- App runtime: `http://127.0.0.1:4044`

## Architecture

```text
┌────────────────────────────────────────────────────────────────┐
│                         Network Sonar                          │
├──────────────────────┬──────────────────────┬──────────────────┤
│ Frontend             │ Backend              │ Storage          │
│ React + Vite         │ Express + TS         │ SQLite           │
│                      │                      │                  │
│ Dashboard            │ REST bootstrap       │ Samples          │
│ Incidents            │ SSE event stream     │ Incident history │
│ Provider config      │ Monitor scheduler    │ Settings/runtime │
│ Runtime controls     │ Worker-thread probes │ Retention state  │
└──────────────────────┴──────────────────────┴──────────────────┘
```

How it works:

1. The backend loads config, runs migrations, and starts the monitor scheduler.
2. Each cycle launches a worker-thread probe against the current target/provider.
3. Samples are stored in SQLite and published to the UI through SSE.
4. The frontend bootstraps over REST, then stays current from the live stream.
5. Incident and provider views reuse the same stored history and monitor settings.

## API Overview

Core endpoints:

- `GET /health`: liveness check
- `GET /api/v1/bootstrap?range=1h|6h|24h|7d|30d`: current snapshot, history, timeline segments, settings, and runtime
- `GET /api/v1/history?from=<unix>&to=<unix>`: raw samples for a time window
- `GET /api/v1/incidents?from=<unix>&to=<unix>`: grouped outage incidents for a time window
- `GET /api/v1/events`: SSE stream for snapshots, samples, settings, runtime, and heartbeats
- `GET /api/v1/monitor/settings`: current provider and sensitivity settings
- `PATCH /api/v1/monitor/settings`: update round-robin mode or confirmation thresholds
- `PATCH /api/v1/monitor/runtime`: switch monitoring between `running` and `paused`

Provider management:

- `POST /api/v1/monitor/providers`
- `PATCH /api/v1/monitor/providers/:providerId`
- `PATCH /api/v1/monitor/providers/order`
- `DELETE /api/v1/monitor/providers/:providerId`

## Available Commands

- `npm run dev`: start backend and frontend workspaces in parallel
- `npm run build`: build both workspaces
- `npm run start`: serve the built frontend from the backend
- `npm run lint`: run ESLint across backend, frontend, and tests
- `npm run typecheck`: run strict TypeScript checks for the full workspace
- `npm test`: run unit, contract, and integration suites
- `npm run test:unit`: run unit tests only
- `npm run test:contract`: run API and stream contract tests
- `npm run test:integration`: run integration tests only

## Validation

Recommended validation before publishing changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Troubleshooting

### The app shows no fresh data

- Check whether monitoring is paused in the UI.
- Confirm the target list is valid and reachable from the host/container.
- Verify the `ping` binary exists and is executable.

### Docker container starts but probing fails

The container requires `NET_RAW` so `ping` can run. If you remove that capability, probing will fail.

### I want LAN access

Set this in `.env` and restart:

```bash
DOCKER_PUBLISH_HOST=0.0.0.0
./sonar.sh start
```

This is intentionally not the default because the app does not include authentication.

### I need to inspect logs

```bash
./sonar.sh logs
```

Or, if you started the container manually:

```bash
docker logs -f network-sonar
```

## Contributing

Contributions are welcome. For local validation, run:

```bash
npm run lint
npm run typecheck
npm test
```

