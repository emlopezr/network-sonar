# Quickstart: Monitor de conectividad local

## Prerrequisitos

- Node.js LTS instalado localmente
- Comando `ping` disponible en el sistema operativo
- Acceso a una gateway local y salida de red hacia el destino configurado

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
MONITOR_GATEWAY_IP=
PORT=4173
```

`MONITOR_GATEWAY_IP` puede quedar vacío para permitir detección automática.

## Desarrollo

1. Iniciar backend y frontend en paralelo:

```bash
npm run dev
```

2. Abrir la interfaz local Vite en el puerto configurado para frontend.

3. Verificar datos iniciales:

```bash
curl http://127.0.0.1:4173/api/v1/bootstrap?range=24h&bucket=300
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
3. Desconectar temporalmente la salida a internet manteniendo la LAN y verificar
   transición a `global_down`.
4. Desconectar la red local o bloquear la gateway y verificar transición a
   `local_down`.
5. Esperar más de una hora o forzar la tarea de purga y comprobar que no quedan
   registros más viejos que la retención configurada.
