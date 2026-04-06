# Auditoría de Producto y Readiness hacia 1.0.0

Fecha: 2026-04-06
Proyecto: `network-sonar`

## Resumen ejecutivo

`Network Sonar` es una aplicación local para monitorear conectividad de red desde una sola máquina. Hoy ya funciona como monitor headless básico con backend Express, almacenamiento SQLite, UI React en tiempo real por SSE, historial de muestras, vista de incidentes agrupados y una pantalla para gestionar proveedores/targets de monitoreo.

El problema principal no es que la app “no haga nada”; sí hace bastante. El problema es que el núcleo funcional todavía no cumple la promesa más importante del spec: distinguir entre caída del proveedor y caída de la red local. En este momento el modelo real sólo maneja `ok`, `down` y `stale`, no `ok`, `global_down` y `local_down`.

Mi evaluación es esta:

- Madurez funcional frente al alcance original de producto: `~65%`
- Madurez técnica/operativa para una 1.0.0 confiable: `~50%`
- Estado real: más cerca de una `0.7 beta interna` que de una `1.0.0 consolidada`

## Para qué sirve hoy

La app sirve para:

- Ejecutar comprobaciones periódicas de conectividad desde una máquina local.
- Persistir resultados ligeros en SQLite.
- Mostrar estado actual en una UI local sin recargar.
- Mantener una línea de tiempo visual de muestras.
- Agrupar rachas continuas de fallo como incidentes.
- Gestionar una lista de targets/proveedores DNS para el monitoreo.

## Features implementadas

### Núcleo de monitoreo

- Scheduler en segundo plano con ciclo periódico de monitoreo: `backend/src/network/monitor-scheduler.ts:10`
- Ejecución de probes en `worker_threads`: `backend/src/network/monitor-worker.ts:24`
- Ejecución real de `ping` del sistema con timeout: `backend/src/network/ping-command.ts:32`
- Soporte para múltiples targets y orden dinámico de prueba: `backend/src/network/target-probe.ts:30`
- Modo “primary with fallback” o “round robin” sobre proveedores activos: `backend/src/network/monitor-scheduler.ts:59`

### Persistencia y backend

- Persistencia ligera en SQLite con WAL: `backend/src/data/db.ts:6`
- Tabla de muestras históricas: `backend/src/data/migrations/001_init.sql:1`
- Purga por retención temporal: `backend/src/data/purge-service.ts:3`
- API REST para bootstrap, historial, incidentes y settings: `backend/src/app.ts:24`
- SSE con `snapshot`, `sample`, `settings` y `heartbeat`: `backend/src/api/sse/status-stream.ts:21`
- Servicio de estado actual con detección de `stale`: `backend/src/services/current-status-service.ts:28`

### Frontend

- Dashboard principal con estado actual, stream SSE y heatmap: `frontend/src/pages/dashboard.tsx:88`
- Heatmap temporal navegable y seleccionable: `frontend/src/components/timeline-heatmap.tsx:43`
- Inspector de muestra seleccionada: `frontend/src/components/inspector-panel.tsx:27`
- Página de incidentes agrupados: `frontend/src/pages/incidents.tsx:71`
- Página de proveedores con CRUD y reordenamiento: `frontend/src/pages/providers.tsx:59`
- Shell de navegación con tres vistas: `frontend/src/app.tsx:17`

### Funcionalidad adicional no prevista tan claramente en el README inicial

- Catálogo de proveedores DNS por defecto: `backend/src/services/monitor-provider-catalog.ts:3`
- CRUD de proveedores custom y modo round robin: `backend/src/services/monitor-settings-service.ts:55`
- Panel de estrategia de proveedores dentro del dashboard: `frontend/src/components/provider-strategy-panel.tsx:8`

## Brechas funcionales fundamentales

Estas son las brechas que hoy impiden llamar a esta app una `1.0.0` del producto definido en `specs/001-local-network-monitor/spec.md`.

### 1. No existe la clasificación local vs proveedor

El spec pide diferenciar `global_down` y `local_down`. El código real sólo modela `ok` y `down`.

- Backend: `backend/src/types/monitor.ts:1`
- Frontend: `frontend/src/types/monitor.ts:4`
- Clasificación actual: `backend/src/services/monitor-cycle-service.ts:3`

Impacto:

- La app detecta caída, pero no diagnostica causa probable.
- El valor diferencial principal del producto todavía no está cumplido.

### 2. La gateway local no participa en el ciclo de monitoreo

Existe un resolver de gateway, pero no está integrado al worker real.

- Resolver implementado pero no usado: `backend/src/network/gateway-resolver.ts:31`
- Worker real sólo ejecuta `runProbeSequence` sobre targets externos: `backend/src/network/worker-entry.ts:6`

Impacto:

- La historia de usuario más importante de diagnóstico sigue incompleta.
- Parte del código parece un refactor/feature a medio integrar.

### 3. La base de datos no persiste diagnóstico de gateway

El schema persistido no guarda `gateway_ip`, `gateway_ok` ni `gateway_latency_ms`.

- Schema real: `backend/src/data/migrations/001_init.sql:1`

Impacto:

- Aunque mañana se integrara la doble verificación, el modelo actual no soporta bien la auditoría histórica pedida por el spec.

### 4. El historial no está agregado por buckets

El plan y los contratos hablan de buckets y `history-append`; la implementación expone muestras crudas.

- Bootstrap devuelve `historyService.getHistory(from, to)`: `backend/src/api/routes/bootstrap.ts:31`
- History route devuelve `samples`, no buckets: `backend/src/api/routes/history.ts:18`
- SSE no emite `history-append`, sólo `snapshot`, `sample`, `settings` y `heartbeat`: `backend/src/api/sse/status-stream.ts:28`

Impacto:

- El contrato documentado y el backend real están desalineados.
- Para rangos grandes, la app depende de mostrar cada muestra individual.

### 5. La app no está realmente “cerrada” como servicio local

El log dice `127.0.0.1`, pero el servidor se levanta sin host explícito.

- `app.listen(config.port, ...)`: `backend/src/server.ts:53`

Impacto:

- En Node esto normalmente expone el servicio en todas las interfaces.
- Para una herramienta “local” esto es un riesgo operativo y de seguridad.

### 6. La documentación del producto quedó detrás del código

README y contratos ya no reflejan el producto real ni el alcance exacto.

- README aún describe sólo `ok/down/stale`: `README.md:5`
- El spec/contratos siguen describiendo `global_down/local_down` y buckets: `specs/001-local-network-monitor/contracts/rest-api.yaml:101`

Impacto:

- Cuesta saber qué versión del producto es “la verdadera”.
- La 1.0.0 necesita una definición única y consistente.

## Qué le falta para consolidar la 1.0.0

### Bloque A: imprescindible

- Implementar de verdad la doble verificación: ping externo + ping a gateway si falla el externo.
- Ampliar el dominio completo a `ok`, `global_down`, `local_down`, `stale`.
- Persistir gateway IP, estado gateway y latencias asociadas.
- Reflejar esa clasificación en snapshot, muestras, incidentes, UI y SSE.
- Decidir si el historial 1.0 será crudo o agregado por buckets. Luego alinear backend, frontend, tests y contratos con esa decisión.
- Corregir el binding del servidor para que sea realmente local por defecto o configurable con claridad.

### Bloque B: imprescindible para release seria

- Dejar `lint`, `typecheck`, `build` y tests en verde en una máquina normal y en CI.
- Agregar `.env.example`.
- Agregar pipeline de CI para validar PRs.
- Limpiar artefactos generados del repo y excluirlos de lint/git.
- Formalizar estrategia de migraciones en vez de parches ad hoc.

### Bloque C: muy recomendable antes de 1.0.0

- Documentar instalación/ejecución headless como servicio del sistema.
- Añadir guía operativa: base de datos, backup, retención, recuperación y troubleshooting de `ping`.
- Definir política de compatibilidad y versión de datos.

## Features sugeridas, pero no fundamentales para 1.0.0

- Notificaciones locales o webhook cuando aparezca un incidente.
- Exportación CSV/JSON de incidentes e historial.
- Métricas agregadas tipo uptime %, MTTR y frecuencia de caídas por ventana.
- Comparativa histórica por proveedor activo.
- Auto-discovery de gateway/entorno más visible en la UI.
- Soporte multi-nodo o acceso remoto autenticado.

## Mejoras de código recomendadas

### Alta prioridad

- Reconciliar dominio, API y UI en torno a un único modelo compartido. Hoy el spec y el código cuentan historias distintas.
- Sacar la lógica SSE/bootstrapping repetida de `Dashboard` y `ProvidersPage` a un hook compartido.
- Formalizar migraciones versionadas. El `ALTER TABLE` puntual en `backend/src/data/db.ts:22` es útil para salir del paso, pero no es una base sólida de release.
- Corregir la higiene del repo: `.gitignore` no excluye `frontend/.vite` y ESLint tampoco lo ignora.

### Media prioridad

- El toggle `Live Stream` del dashboard es engañoso: apaga el auto-scroll visual, pero no corta la suscripción SSE ni deja de aplicar muestras.
  Evidencia: el stream siempre se conecta en `frontend/src/pages/dashboard.tsx:149` y el toggle sólo cambia `liveMode` en `frontend/src/pages/dashboard.tsx:262`.
- El router manual con `history.pushState` es suficiente ahora, pero si la app sigue creciendo convendrá usar un router real.
- La agrupación de incidentes usa rachas de `down` continuas, pero no modela bien fallos multi-proveedor cuando cambia el target durante la incidencia.

### Baja prioridad

- Reducir pequeñas duplicaciones de formateo de fechas y normalización de snapshots en varias páginas.
- Revisar naming para dejar más claro qué partes son “monitor samples” y cuáles son “incident summaries”.

## Estado de validación observado

### Validaciones que sí pasaron

- `npm run typecheck`
- `npm run build`
- `npm run test:unit`

Resultado unitario observado:

- `5` archivos de tests unitarios
- `15` tests unitarios pasando

### Validaciones con problemas

- `npm run lint` falla porque ESLint entra en `frontend/.vite/...` y exige type info para archivos generados.
  Evidencia:
  - ignores actuales: `eslint.config.js:7`
  - `.gitignore` actual: `.gitignore:1`
  - el árbol tiene artefactos `.vite` versionados/no ignorados.

- `npm test` no quedó verde completo en este entorno porque los contract tests necesitan abrir sockets locales y este sandbox lo bloquea con `EPERM`.
  Evidencia:
  - helper SSE abre `app.listen(0, "127.0.0.1", ...)`: `tests/helpers/sse.ts:11`
  - harness crea la app Express real: `tests/helpers/test-harness.ts:48`

Conclusión de validación:

- La base compila y tiene buena cantidad de cobertura unitaria.
- Todavía no puedo certificarla como release-grade porque el pipeline no está limpio ni estabilizado.

## Estimación de esfuerzo para llegar a 1.0.0

Si el objetivo es una `1.0.0` honesta respecto del spec original, faltan aproximadamente:

- `40%` del alcance funcional realmente diferenciador
- `50%` del hardening técnico/operativo

Traducido a trabajo:

- 1 bloque grande de core domain y persistencia
- 1 bloque mediano de API/UI/tests para reflejar la nueva clasificación
- 1 bloque mediano de release hardening y documentación

## Recomendación final

No publicaría `1.0.0` todavía.

Sí veo una base suficientemente seria para cerrar una `0.8.x` o `0.9.0-beta` interna si se quiere iterar rápido, porque:

- el producto ya es usable,
- el UI ya tiene forma clara,
- el backend ya tiene estructura razonable,
- y la idea de proveedores/configuración agrega valor real.

Pero para una `1.0.0` sólida recomendaría cerrar, en este orden:

1. Diagnóstico real `global_down` vs `local_down`.
2. Alineación completa de tipos, DB, API, SSE, tests y UI.
3. Endurecimiento operativo: bind local, lint limpio, CI, `.env.example`, migraciones.
4. Documentación final de instalación y operación.
