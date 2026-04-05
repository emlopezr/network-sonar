# Research: Monitor de conectividad local

## Decision 1: Monorepo con workspaces y configuración TypeScript compartida

- **Decision**: Usar un workspace único en la raíz con `backend/` y `frontend/`
  separados, compartiendo `tsconfig.base.json`, scripts raíz y configuración de
  lint.
- **Rationale**: Mantiene un monolito desplegable sin mezclar responsabilidades
  y evita duplicar configuración entre paquetes.
- **Alternatives considered**:
  - Repositorio plano sin `backend/` y `frontend/`: más corto al inicio, pero
    empeora límites entre API y UI.
  - Dos repositorios distintos: contradice la constitución de monolito.

## Decision 2: REST para bootstrap + SSE para tiempo real

- **Decision**: Cargar el estado inicial e historial vía REST y mantener
  actualizaciones en vivo con Server-Sent Events.
- **Rationale**: El flujo de datos es unidireccional. SSE cubre reconexión
  automática, menor complejidad y evita la sobrecarga conceptual de WebSockets.
- **Alternatives considered**:
  - WebSockets: útil para bidireccionalidad, pero innecesario aquí.
  - Polling periódico: más simple que WebSockets, pero desperdicia ciclos y
    aumenta latencia percibida.

## Decision 3: Una sola tabla SQLite con retención temporal

- **Decision**: Persistir muestras en `connection_logs` y purgar datos de más de
  30 días cada hora.
- **Rationale**: A 5 segundos por muestra, el volumen de 30 días sigue siendo
  manejable en SQLite local y evita diseñar tablas de agregación prematuras.
- **Alternatives considered**:
  - Tabla cruda + tabla agregada: mejora almacenamiento a largo plazo, pero
    añade complejidad innecesaria para v1.
  - Archivos rotativos JSON/CSV: más frágil para consultas, índices y filtros.

## Decision 4: Pings del sistema operativo mediante Node estándar

- **Decision**: Ejecutar el comando `ping` del sistema operativo usando
  `node:child_process` desde un worker thread.
- **Rationale**: Elimina dependencias externas de ping, evita privilegios
  especiales y mantiene la lógica encapsulada en un adaptador sencillo.
- **Alternatives considered**:
  - Paquete `ping` de npm: agrega una capa intermedia con valor limitado.
  - `net-ping` o ICMP raw sockets: más complejos y potencialmente sensibles a
    permisos/capacidades del sistema.

## Decision 5: Gateway local resuelta por configuración con fallback al sistema

- **Decision**: Resolver la gateway en este orden: variable/config local
  explícita, detección por tabla de rutas del sistema operativo, y si no existe,
  marcar estado como no determinable hasta poder resolverla.
- **Rationale**: Permite control manual cuando la red es especial y evita
  depender de una librería adicional solo para descubrir la ruta por defecto.
- **Alternatives considered**:
  - Dependencia dedicada para gateway por defecto: simplifica implementación
    pero añade un paquete adicional.
  - Requerir configuración manual obligatoria: reduce automatización y empeora
    la experiencia inicial.

## Decision 6: Historial visual agregado por bucket en servidor

- **Decision**: Entregar historial inicial como buckets agregados y muestras
  crudas solo cuando el rango pedido sea reducido.
- **Rationale**: Limita payload inicial, mantiene la interfaz ligera y evita
  transferir cientos de miles de registros a la UI.
- **Alternatives considered**:
  - Enviar siempre todas las muestras crudas: simple, pero escala mal.
  - Agregar totalmente en frontend: desperdicia ancho de banda y memoria.
