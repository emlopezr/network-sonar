# SSE Contract: Monitor de conectividad local

Endpoint: `GET /api/v1/events`  
Content-Type: `text/event-stream`

## Connection Semantics

- El servidor envía `retry: 5000` al abrir la conexión.
- El servidor emite un evento `snapshot` inmediatamente después de conectar.
- El servidor emite `heartbeat` cada 15 segundos aunque no existan cambios.
- El cliente debe reintentar automáticamente al perder la conexión.

## Event: `snapshot`

Evento inicial con el estado actual completo.

```text
event: snapshot
data: {"current":{"observedAt":1712345678,"status":"ok","externalTarget":"1.1.1.1","gatewayIp":"192.168.1.1","externalOk":true,"gatewayOk":null,"staleAfterSeconds":15,"lastChangeAt":1712345600}}
```

## Event: `sample`

Nueva muestra persistida en la base.

```text
event: sample
data: {"observedAt":1712345683,"status":"global_down","externalTarget":"1.1.1.1","gatewayIp":"192.168.1.1","externalOk":false,"gatewayOk":true,"externalLatencyMs":null,"gatewayLatencyMs":2,"failureReason":"timeout"}
```

## Event: `history-append`

Segmento listo para actualizar la visualización.

```text
event: history-append
data: {"bucketStart":1712345400,"bucketEnd":1712345700,"dominantStatus":"global_down","sampleCount":60,"downCount":12}
```

## Event: `heartbeat`

Mantiene viva la conexión SSE.

```text
event: heartbeat
data: {"now":1712345695}
```
