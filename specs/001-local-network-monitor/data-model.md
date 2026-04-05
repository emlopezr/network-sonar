# Data Model: Monitor de conectividad local

## Entity: ConnectionLog

**Purpose**: Representa una muestra persistida de un ciclo de monitoreo.

**Fields**:

- `id`: entero autoincremental, identificador interno.
- `observedAt`: entero Unix epoch en segundos, instante del ciclo.
- `statusCode`: enumeración persistida (`0=ok`, `1=global_down`, `2=local_down`).
- `externalTarget`: texto, destino externo configurado para la sonda.
- `gatewayIp`: texto nullable, gateway local usada en el ciclo.
- `externalOk`: booleano persistido como entero (`0/1`).
- `gatewayOk`: booleano nullable persistido como entero (`0/1`).
- `externalLatencyMs`: entero nullable.
- `gatewayLatencyMs`: entero nullable.
- `failureReason`: texto nullable con detalle corto de timeout, comando o error.
- `createdAt`: entero Unix epoch en segundos del momento de inserción.

**Validation Rules**:

- `observedAt` MUST ser único por ciclo.
- `statusCode` MUST pertenecer al conjunto `{0,1,2}`.
- `gatewayOk` solo puede ser `NULL` cuando el ping a gateway no se ejecutó.
- `externalLatencyMs` y `gatewayLatencyMs` MUST ser `NULL` si la sonda falla
  antes de medir latencia.

## Entity: CurrentStatusSnapshot

**Purpose**: Estado actual consumido por REST y SSE.

**Fields**:

- `observedAt`: instante de la última muestra válida.
- `status`: enumeración textual (`ok`, `global_down`, `local_down`, `stale`).
- `externalTarget`: destino monitorizado.
- `gatewayIp`: gateway actual o `null`.
- `externalOk`: booleano.
- `gatewayOk`: booleano o `null`.
- `staleAfterSeconds`: umbral para marcar la muestra como no reciente.
- `lastChangeAt`: instante del último cambio de estado.

**Derivation Rules**:

- Se deriva de la última fila en `ConnectionLog` y del reloj actual.
- Si `now - observedAt > staleAfterSeconds`, la API la expone como `stale`
  sin alterar el estado persistido original.

## Entity: HistoryBucket

**Purpose**: Segmento temporal para heatmap o timeline en frontend.

**Fields**:

- `bucketStart`: inicio del segmento en Unix epoch.
- `bucketEnd`: fin del segmento en Unix epoch.
- `dominantStatus`: estado dominante del bucket.
- `sampleCount`: número de muestras incluidas.
- `downCount`: número de muestras no `ok`.
- `samples`: arreglo opcional de muestras crudas cuando el rango es reducido.

**Validation Rules**:

- `bucketEnd` MUST ser mayor que `bucketStart`.
- `sampleCount` MUST ser mayor o igual a `downCount`.
- `samples` solo se incluye cuando la resolución solicitada es `5` segundos.

## State Transitions

Estado clasificado por ciclo:

- `ok` -> `ok`: la sonda externa responde.
- `ok` -> `global_down`: falla la sonda externa y la gateway responde.
- `ok` -> `local_down`: fallan sonda externa y gateway.
- `global_down` -> `ok`: la sonda externa vuelve a responder.
- `local_down` -> `global_down`: la gateway vuelve a responder, pero el destino
  externo sigue fallando.
- `local_down` -> `ok`: vuelven a responder gateway y destino externo.
- Cualquier estado -> `stale`: transición derivada en API/UI cuando no llegan
  muestras recientes; no se persiste como fila propia en v1.

## Relationships

- `CurrentStatusSnapshot` se deriva de `ConnectionLog`.
- `HistoryBucket` agrupa una o más filas de `ConnectionLog`.

## Retention Rules

- `ConnectionLog` conserva solo los últimos 30 días.
- La purga corre cada 1 hora y al inicio del servicio.
- `HistoryBucket` no se persiste; se calcula al consultar.
