# Repository Guidelines

## Project Structure & Module Organization
`backend/` contains the Express API, monitoring workers, and SQLite access under `backend/src/{api,data,network,services}`. `frontend/` contains the React/Vite UI under `frontend/src/{components,pages,services}`. Shared automated tests live in `tests/`, split into `unit/`, `contract/`, `integration/`, plus `helpers/` and `setup.ts`. Planning artifacts live in `specs/`; treat `.specify/`, `dist/`, and `node_modules/` as generated or tooling-managed.

## Build, Test, and Development Commands
Run everything from the repository root.

- `npm install`: install workspace dependencies.
- `npm run dev`: start backend and frontend in parallel.
- `npm run build`: build the frontend bundle and backend TypeScript output.
- `npm run start`: serve the built frontend from the backend on port `4173` by default.
- `npm run lint`: run ESLint across backend, frontend, and tests.
- `npm run typecheck`: enforce strict TypeScript checks for all workspaces and tests.
- `npm test`: run the unit, contract, and integration Vitest suites.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode enabled. Follow the existing style: double quotes, semicolons, and grouped imports. Prefer `import type` where applicable; ESLint enforces it. Use `PascalCase` for React components and exported types, `camelCase` for functions and variables, and kebab-case for filenames such as `status-card.tsx` or `monitor-service.ts`. Keep backend modules focused by concern rather than by layer-crossing utilities.

## Testing Guidelines
Vitest is the main test runner; backend HTTP behavior is exercised with Supertest, and frontend rendering uses Testing Library via jsdom. Place tests in the matching folder and use `*.test.ts` or `*.test.tsx` naming. Add or update tests with every behavior change; there is no visible coverage gate yet, so contributors are expected to maintain practical coverage across unit, contract, and integration levels.

## Commit & Pull Request Guidelines
The history is still short, but it already mixes release-style subjects and Conventional Commit prefixes such as `chore:`. Prefer short, imperative commit titles and use a Conventional Commit prefix when it clarifies scope, for example `feat: add stale status indicator`. Pull requests should include a clear summary, linked spec or issue when available, validation steps (`npm test`, `npm run lint`, `npm run typecheck`), and screenshots for UI changes.

## Security & Configuration Tips
Configuration is driven by root `.env` values such as `PORT`, `MONITOR_TARGET`, and `MONITOR_DB_PATH`. Do not commit secrets or machine-specific overrides. The app depends on a working system `ping` binary, so call out OS-specific assumptions when changing monitor behavior.
