# Feature Specification: Monitor de conectividad local

**Feature Branch**: `001-local-network-monitor`
**Created**: 2026-04-05
**Status**: Draft
**Input**: User description: "Basado en la constitución, genera la especificación completa para nuestra herramienta de monitoreo de red local. El sistema debe: 1. Ejecutar un 'worker' en segundo plano que haga un ping cada 5 segundos a un DNS confiable (ej. 1.1.1.1). 2. Implementar una doble comprobación: si el ping global falla, debe hacer ping a la puerta de enlace local (router) para determinar si la caída es del proveedor o de la red local. 3. Persistir cada resultado (timestamp y estado) de forma ligera para no saturar el disco con el tiempo. 4. Exponer una interfaz web local que muestre el estado de la conexión en tiempo real sin necesidad de recargar la página. 5. Mostrar en la web un historial visual (tipo heatmap o línea de tiempo) diferenciando estados con colores (verde = OK, rojo = Caída global, amarillo = Caída local). 5, El proceso debe ser totalmente 'headless' e imperceptible en consumo de CPU/RAM."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver estado actual en vivo (Priority: P1)

Como usuario local, quiero abrir una interfaz web y ver el estado actual de mi
conexión sin recargar la página, para saber de inmediato si el servicio de
internet está disponible o si existe una caída.

**Why this priority**: El valor principal del producto es detectar y mostrar el
estado actual de la conectividad en tiempo real. Sin esto, el sistema no cumple
su objetivo principal.

**Independent Test**: Con el monitor activo, abrir la interfaz local y provocar
una transición controlada entre conexión sana y caída. La interfaz debe reflejar
el nuevo estado automáticamente dentro del siguiente ciclo de monitoreo.

**Acceptance Scenarios**:

1. **Given** el monitor está activo y la conexión externa funciona, **When** un
   usuario abre la interfaz local, **Then** ve el estado actual como operativo y
   este valor se mantiene actualizado sin recargar la página.
2. **Given** la conectividad externa falla pero la red local sigue disponible,
   **When** termina el siguiente ciclo de comprobación, **Then** la interfaz
   cambia al estado de caída global y lo muestra como incidente del proveedor.
3. **Given** falla tanto la conectividad externa como el acceso a la puerta de
   enlace local, **When** termina el siguiente ciclo de comprobación, **Then** la
   interfaz cambia al estado de caída local y lo muestra como problema de la red
   interna.

---

### User Story 2 - Distinguir el tipo de caída (Priority: P2)

Como usuario que diagnostica problemas, quiero que el sistema diferencie entre
caídas del proveedor y fallas de mi red local, para decidir con rapidez dónde
debo intervenir.

**Why this priority**: La doble comprobación convierte una alarma genérica en un
diagnóstico útil. Sin esta distinción, el usuario pierde tiempo interpretando la
causa probable del problema.

**Independent Test**: Simular un fallo externo con la red local activa y luego
simular una caída local. En ambos casos, verificar que el sistema clasifica el
incidente correcto y lo conserva en el historial.

**Acceptance Scenarios**:

1. **Given** el objetivo externo no responde y la puerta de enlace local sí
   responde, **When** el sistema clasifica el resultado, **Then** registra una
   caída global.
2. **Given** ni el objetivo externo ni la puerta de enlace local responden,
   **When** el sistema clasifica el resultado, **Then** registra una caída local.

---

### User Story 3 - Revisar el historial visual (Priority: P3)

Como usuario local, quiero revisar un historial visual con colores por estado,
para identificar patrones de inestabilidad y saber cuándo ocurrieron los
incidentes.

**Why this priority**: El historial transforma observaciones aisladas en una
visión útil de estabilidad. Es menos crítico que el estado actual, pero aumenta
mucho el valor práctico del monitoreo.

**Independent Test**: Ejecutar el sistema durante un periodo con cambios
controlados de estado y abrir la interfaz. El historial debe mostrar una
secuencia temporal legible con los colores correctos para cada estado.

**Acceptance Scenarios**:

1. **Given** existen muestras históricas de estados distintos, **When** el
   usuario abre la vista de historial, **Then** ve una línea de tiempo o heatmap
   con verde para estado operativo, rojo para caída global y amarillo para caída
   local.
2. **Given** el usuario mantiene abierta la interfaz mientras llegan nuevas
   muestras, **When** se registra un nuevo resultado, **Then** el historial se
   actualiza sin recargar la página.

---

### Edge Cases

- ¿Qué ocurre si el monitor se inicia antes de que el sistema conozca una puerta
  de enlace local válida o si esta cambia durante la ejecución?
- ¿Cómo se muestra el estado cuando una comprobación expira, pero la siguiente
  comprobación se recupera de inmediato?
- ¿Cómo responde la interfaz si el navegador se reconecta después de haber
  estado desconectado del servicio local durante varios minutos?
- ¿Qué ocurre cuando el historial detallado alcanza el límite de retención y se
  compactan o eliminan datos antiguos?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST ejecutar una comprobación de conectividad externa cada
  5 segundos mientras el monitor esté en funcionamiento.
- **FR-002**: System MUST usar un objetivo externo confiable como referencia
  principal para determinar el estado general de conectividad.
- **FR-003**: System MUST ejecutar una segunda comprobación contra la puerta de
  enlace local cada vez que falle la comprobación externa principal.
- **FR-004**: System MUST clasificar cada ciclo de monitoreo en uno de estos
  estados: operativo, caída global o caída local.
- **FR-005**: System MUST persistir cada resultado con su marca temporal y
  estado clasificado.
- **FR-006**: System MUST aplicar retención, compactación o expiración
  automática del historial para evitar crecimiento indefinido del uso de disco.
- **FR-007**: System MUST exponer una interfaz web local accesible sin depender
  de servicios externos para visualizar el estado de la conexión.
- **FR-008**: System MUST actualizar el estado visible y el historial en la
  interfaz sin requerir recarga manual de la página.
- **FR-009**: System MUST mostrar el historial visual con una codificación de
  color consistente: verde para operativo, rojo para caída global y amarillo
  para caída local.
- **FR-010**: System MUST seguir funcionando en segundo plano sin requerir una
  ventana visible ni interacción manual continua.
- **FR-011**: System MUST indicar cuando la información mostrada en la interfaz
  ya no es reciente para que el usuario distinga datos actuales de datos
  potencialmente atrasados.

### Key Entities _(include if feature involves data)_

- **Connection Sample**: Registro individual de una comprobación con marca
  temporal, estado final clasificado y señal suficiente para reconstruir la
  evolución de la conexión.
- **Current Status Snapshot**: Estado vigente que resume la condición más
  reciente de la conexión y su vigencia para la interfaz en tiempo real.
- **History Segment**: Representación temporal utilizada para mostrar el
  historial visual y conservar tendencias sin requerir crecimiento ilimitado del
  almacenamiento.

## Technical Constraints _(mandatory)_

- **TC-001**: La solución MUST respetar contratos tipados estrictos entre las
  capas de monitoreo, persistencia, API local e interfaz.
- **TC-002**: La solución MUST mantenerse dentro de la aplicación local única
  definida por el proyecto, sin depender de servicios separados para monitoreo,
  almacenamiento o visualización.
- **TC-003**: La persistencia MUST seguir una estrategia ligera de almacenamiento
  local y documentar cómo evita el crecimiento indefinido del historial.
- **TC-004**: Las comprobaciones de red MUST ejecutarse fuera del flujo
  interactivo que atiende la interfaz local y MUST definir límites de espera y
  concurrencia.
- **TC-005**: Esta funcionalidad afecta como mínimo estos módulos del sistema:
  monitoreo en segundo plano, persistencia local, API local y visualización web
  en tiempo real.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: La interfaz refleja cualquier cambio de estado dentro de 10
  segundos desde que ocurre una caída o recuperación real.
- **SC-002**: En validaciones controladas, al menos el 95% de los incidentes se
  clasifican correctamente como operativo, caída global o caída local.
- **SC-003**: Un usuario puede abrir la interfaz local y comprender el estado
  actual y la causa probable de una incidencia en menos de 30 segundos, sin
  recargar manualmente la página.
- **SC-004**: Tras 30 días de operación continua, el historial persistido se
  mantiene dentro del presupuesto de almacenamiento definido para el producto
  sin pérdida de visibilidad reciente sobre incidentes.
- **SC-005**: Durante una ejecución continua de 24 horas en un equipo personal
  estándar, el monitor mantiene un uso de CPU y memoria lo bastante bajo como
  para no degradar perceptiblemente otras tareas del usuario.

## Assumptions

- El producto monitorea una única conexión local a internet en su primera
  versión.
- El sistema puede determinar una puerta de enlace local válida cuando la red
  interna está operativa.
- La interfaz será usada por personas con acceso local o de confianza al equipo
  donde corre el monitor; control de acceso avanzado queda fuera de alcance en
  esta versión.
- El historial detallado prioriza la visibilidad reciente y puede compactar o
  resumir datos antiguos para conservar el uso de disco.
- La detección usa un único objetivo externo confiable por defecto y no incluye
  múltiples destinos o redundancia geográfica en esta versión.
