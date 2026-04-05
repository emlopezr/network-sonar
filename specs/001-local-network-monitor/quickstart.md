# Quickstart: Monitor de conectividad local

## Prerrequisitos

- Node.js LTS instalado localmente
- Comando `ping` disponible en el sistema operativo
- Salida de red hacia el destino configurado

## Configuración inicial

1. Instalar dependencias del workspace:

```bash
npm install
```

2. Configurar variables locales en un archivo `.env` raíz o exportarlas:

```bash
MONITOR_TARGET=1.1.1.1
MONITOR_INTERVAL_SECONDS=5
MONITOR_RETENTION_DAYS=30
PORT=4173
```

## Desarrollo

1. Iniciar backend y frontend en paralelo:

```bash
npm run dev
```

2. Abrir la interfaz local Vite en `http://127.0.0.1:5173`.

3. Verificar datos iniciales:

```bash
curl http://127.0.0.1:4173/api/v1/bootstrap?range=24h
```

4. Verificar streaming SSE:

```bash
curl -N http://127.0.0.1:4173/api/v1/events
```

## Build de producción

1. Compilar frontend y backend:

```bash
npm run build
```

2. Iniciar el backend sirviendo `frontend/dist`:

```bash
npm run start
```

3. Abrir `http://127.0.0.1:4173`.

## Verificación funcional mínima

1. Confirmar que `/health` responde `{"ok":true,...}`.
2. Confirmar que `/api/v1/bootstrap` devuelve `current` e `history`.
3. Desconectar temporalmente la salida a internet y verificar transición a
   `down`.
4. Volver a conectar y verificar recuperación automática a `ok`.
5. Esperar más de una hora o forzar la tarea de purga y comprobar que no quedan
   registros más viejos que la retención configurada.
