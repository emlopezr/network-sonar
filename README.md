# Network Sonar

Monitor local de conectividad con backend Express, frontend React/Vite,
persistencia ligera en SQLite y actualizaciones en tiempo real por SSE.

## Requisitos

- Node.js 22+
- Comando `ping` disponible en el sistema operativo

## Desarrollo

Instalar dependencias:

```bash
npm install
```

Levantar backend y frontend en paralelo:

```bash
npm run dev
```

Puertos por defecto:

- Frontend Vite: `http://127.0.0.1:5173`
- Backend API y servidor integrado: `http://127.0.0.1:4173`

## Variables de entorno

Se pueden definir en `.env` en la raíz:

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

## Validación

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Producción

Compilar y arrancar el backend sirviendo `frontend/dist`:

```bash
npm run build
npm run start
```

La interfaz queda servida desde `http://127.0.0.1:4173`.

## Comportamiento

- El backend ejecuta un ping externo cada 5 segundos.
- Cada resultado se guarda como una muestra cruda `ok` o `down`.
- El frontend carga el rango inicial por REST y luego se actualiza solo por SSE.
- El historial muestra cada muestra individual en una linea de tiempo; al pasar o hacer click en un bloque ves su hora exacta, estado, latencia y motivo de fallo.
