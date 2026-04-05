# Implementation Plan: Monitor de conectividad local

**Branch**: `001-local-network-monitor` | **Date**: 2026-04-05 | **Spec**: [/home/perso/proyectos/network-sonar/specs/001-local-network-monitor/spec.md](/home/perso/proyectos/network-sonar/specs/001-local-network-monitor/spec.md)
**Input**: Feature specification from `/specs/001-local-network-monitor/spec.md`

**Note**: This plan covers Phase 0 research and Phase 1 technical design for the
local network monitor monolith.

## Summary

Construir un monolito TypeScript con `backend/` y `frontend/` separados bajo un
workspace común. El backend ejecutará un worker de monitoreo que lanza pings del
sistema operativo cada 5 segundos fuera del hilo principal, clasifica el estado
como `ok`, `global_down` o `local_down`, persiste muestras ligeras en SQLite con
retención temporal, y expone datos iniciales vía REST más actualizaciones en
tiempo real vía SSE. El frontend Vite cargará un snapshot inicial e historial
agregado y mantendrá el estado en vivo mediante EventSource, mientras Express
servirá `frontend/dist` en producción.

## Technical Context

**Language/Version**: TypeScript 5.x con `strict` habilitado sobre Node.js LTS  
**Primary Dependencies**: Express, React, Vite, better-sqlite3, Vitest, Supertest, Playwright, Node `worker_threads`, Node `child_process`  
**Storage**: SQLite vía SQL directo con `better-sqlite3`  
**Testing**: Vitest para unitarias y servicios, Supertest para HTTP/SSE, Playwright para validación UI local end-to-end  
**Target Platform**: Equipo local o mini-servidor doméstico con Node.js y comando `ping` del sistema operativo disponible  
**Project Type**: Monolithic web application with Express + React  
**Performance Goals**: Muestreo cada 5 segundos sin bloquear el event loop; interfaz actualizada en menos de 10 segundos; consumo estable y bajo en ejecución continua  
**Constraints**: TypeScript estricto, sin ORM pesado, sin state manager complejo en React, sondas fuera del hilo principal, persistencia ligera con purga automática, servicio completamente headless  
**Scale/Scope**: Una conexión local monitorizada, un destino externo por defecto, historial reciente detallado de 30 días, acceso web local para uno o pocos navegadores simultáneos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] All changed backend, frontend, and shared application code remains in
      TypeScript with explicit interfaces at layer boundaries.
- [x] The design fits a single deployable monolith where Express serves the
      built React application in production.
- [x] Persistence uses direct SQL with `better-sqlite3`, or any exception is
      documented in Complexity Tracking with a rejected simpler alternative.
- [x] Probe execution is isolated from the Node.js main thread and includes
      timeout plus concurrency handling.
- [x] Module boundaries stay explicit across data access, network worker or
      service logic, API routes, and frontend layers.

Initial gate result: PASS.  
Post-design gate result: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-local-network-monitor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rest-api.yaml
│   └── sse-events.md
└── tasks.md
```

### Source Code (repository root)

```text
.
├── package.json
├── tsconfig.base.json
├── eslint.config.js
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite-env.d.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── api/
│       │   ├── routes/
│       │   │   ├── bootstrap.ts
│       │   │   ├── history.ts
│       │   │   └── health.ts
│       │   └── sse/
│       │       └── status-stream.ts
│       ├── data/
│       │   ├── db.ts
│       │   ├── migrations/
│       │   │   └── 001_init.sql
│       │   ├── connection-log-repository.ts
│       │   └── purge-service.ts
│       ├── network/
│       │   ├── monitor-worker.ts
│       │   ├── ping-command.ts
│       │   ├── gateway-resolver.ts
│       │   └── monitor-scheduler.ts
│       ├── services/
│       │   ├── monitor-service.ts
│       │   ├── history-service.ts
│       │   └── event-bus.ts
│       └── types/
│           ├── monitor.ts
│           ├── api.ts
│           └── storage.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── dist/
│   └── src/
│       ├── main.tsx
│       ├── app.tsx
│       ├── components/
│       │   ├── status-card.tsx
│       │   ├── timeline-heatmap.tsx
│       │   └── legend.tsx
│       ├── pages/
│       │   └── dashboard.tsx
│       ├── services/
│       │   ├── api-client.ts
│       │   └── status-stream.ts
│       └── types/
│           └── monitor.ts
└── tests/
    ├── contract/
    ├── integration/
    └── unit/
```

**Structure Decision**: Root workspace compartido con `package.json` y
`tsconfig.base.json` reutilizados por `backend/` y `frontend/`. El backend
concentra datos, worker y entrega de estáticos. El frontend permanece aislado en
Vite, pero compila a `frontend/dist` para que Express lo sirva en producción.

## Architecture Notes

### Runtime Flow

1. `monitor-scheduler` dispara un ciclo cada 5 segundos.
2. El scheduler delega el trabajo a `monitor-worker` usando `worker_threads`.
3. El worker invoca el binario `ping` del sistema vía `node:child_process`,
   primero contra el objetivo externo y, si falla, contra la gateway local.
4. `monitor-service` clasifica el resultado y persiste la muestra.
5. `event-bus` publica el snapshot nuevo a los clientes SSE.
6. El frontend obtiene el bootstrap por REST y luego mantiene sincronía por SSE.

### Database Schema

La base usará una sola tabla transaccional para maximizar simplicidad y dejar el
snapshot actual derivado de la fila más reciente.

```sql
CREATE TABLE IF NOT EXISTS connection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observed_at INTEGER NOT NULL,
  status_code INTEGER NOT NULL CHECK (status_code IN (0, 1, 2)),
  external_target TEXT NOT NULL,
  gateway_ip TEXT,
  external_ok INTEGER NOT NULL CHECK (external_ok IN (0, 1)),
  gateway_ok INTEGER CHECK (gateway_ok IN (0, 1)),
  external_latency_ms INTEGER,
  gateway_latency_ms INTEGER,
  failure_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (observed_at)
);

CREATE INDEX IF NOT EXISTS idx_connection_logs_observed_at
  ON connection_logs (observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_logs_status_time
  ON connection_logs (status_code, observed_at DESC);
```

`status_code` map:

- `0` = `ok`
- `1` = `global_down`
- `2` = `local_down`

Retención:

- Mantener muestras crudas por 30 días.
- Ejecutar purga cada 1 hora o al arrancar el proceso.
- SQL exacto:

```sql
DELETE FROM connection_logs
WHERE observed_at < unixepoch() - (30 * 24 * 60 * 60);
```

Con frecuencia de 5 segundos esto mantiene alrededor de 518,400 filas máximas,
volumen asumible para SQLite en local sin necesidad de tabla agregada adicional
en la primera versión.

### API Design

Se elige REST + SSE. No se usarán WebSockets porque el flujo en tiempo real es
solo servidor -> cliente y SSE reduce complejidad.

Endpoints:

- `GET /api/v1/bootstrap?range=24h&bucket=300`
  - Devuelve snapshot actual, metadatos de retención y serie histórica inicial.
- `GET /api/v1/history?from=<unix>&to=<unix>&bucket=<seconds>`
  - Devuelve muestras crudas si `bucket=5`; devuelve segmentos agregados para
    ventanas mayores.
- `GET /api/v1/events`
  - `Content-Type: text/event-stream`
  - Emite `snapshot`, `sample`, `history-append` y `heartbeat`.
- `GET /health`
  - Healthcheck local del proceso.

Modelo SSE:

- `snapshot`: estado actual completo al conectar.
- `sample`: nueva muestra cruda persistida.
- `history-append`: segmento listo para pintar en UI.
- `heartbeat`: cada 15 segundos para mantener viva la conexión.

### Frontend Build and Delivery

Vite compila el frontend a `frontend/dist`. El backend sirve esos archivos cuando
`NODE_ENV=production`.

Scripts de workspace propuestos:

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:backend dev:frontend",
    "dev:backend": "npm --workspace backend run dev",
    "dev:frontend": "npm --workspace frontend run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "npm --workspace frontend run build",
    "build:backend": "npm --workspace backend run build",
    "start": "npm --workspace backend run start"
  }
}
```

Servidor Express en producción:

```ts
app.use(express.static(frontendDistPath));
app.get(/^\/(?!api|health).*/, (_req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});
```

### Ping Strategy

La “librería” elegida para pings es la librería estándar de Node:
`node:child_process`, ejecutada desde `node:worker_threads` para aislar el costo
de proceso. No se añade dependencia externa de ping.

Motivos:

- evita paquetes pesados o poco mantenidos;
- evita ICMP raw sockets y permisos elevados;
- aprovecha el binario `ping` ya disponible en el sistema operativo;
- encaja mejor con la constitución de simplicidad.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
