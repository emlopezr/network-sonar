# Network Sonar Roadmap to 1.0.0

Fecha: 2026-04-06
Proyecto: `network-sonar`
Release target: `1.0.0`

## Objetivo de la 1.0.0

Entregar una herramienta local, ligera y confiable para monitorear si un equipo tiene acceso real a internet mediante `ping` a targets externos confiables.

La 1.0.0 debe ser:

- útil en el día a día
- fácil de desplegar
- silenciosa y de bajo consumo
- portable a otro PC sin demasiado trabajo
- segura por defecto
- visualmente clara, sin sobrecargar la UI

## Principios de producto

- Personal-first, pero instalable en otros equipos.
- Docker como camino principal de despliegue.
- Mantener muestras crudas para precisión técnica.
- Usar segmentos para la visualización principal.
- Mostrar `NO DATA` cuando no hubo medición.
- Evitar complejidad prematura.
- Seguridad local-first: mínima superficie expuesta.

## Estado actual resumido

### Ya existe

- monitoreo periódico cada 5 segundos
- sondeo paralelo de providers dentro de cada ciclo para no degradar la cadencia cuando todos fallan
- persistencia en SQLite
- backend Express + frontend React
- SSE en vivo
- historial en UI
- vista de incidentes
- gestión de providers
- sensibilidad configurable para confirmación `ok -> down` y `down -> ok`
- estado confirmado e incidentes derivados de transiciones confirmadas
- base visual razonablemente buena

### Aún no está consolidado

- la timeline larga se vuelve pesada por renderizar demasiadas muestras
- no existe timeline segmentada
- no existe `NO DATA` como bloque explícito
- no existe control claro `on/off` del monitor
- falta packaging oficial por Docker
- falta alinear seguridad, docs, UI y refactors de base

## Consideraciones de diseño ya cerradas

- Las muestras crudas se siguen guardando siempre; no se reemplazan por estado derivado.
- El estado actual visible y los incidentes dependen del estado confirmado, no de cada muestra individual.
- Una caída se confirma con `N` fallos consecutivos y una recuperación con `M` éxitos consecutivos.
- Para 1.0, `N` y `M` ya son configurables desde settings y se aplican sólo hacia adelante; no reinterpretan el historial pasado.
- Las transiciones confirmadas son retroactivas al inicio de la racha candidata: el incidente empieza en el primer fallo de la racha confirmada y termina en el primer éxito de la racha confirmada.
- Un microcorte que sí alcanza la confirmación mínima cuenta como incidente real.
- `STALE` significa falta de actividad reciente del monitor/stream, no una caída confirmada.
- La cadencia objetivo sigue siendo una muestra cada 5 segundos; si todos los providers fallan, el ciclo no debe degradarse por probar targets en serie.
- Historias futuras de segmentos, uptime, `NO DATA` e incidentes deben derivarse de transiciones confirmadas más muestras crudas, no redefinir estas reglas.

## Roadmap por historias/épicas

## 1. [DONE] Modelo de estado y confirmación de incidentes

Estado: `hecho`

### Historia / problema

Como usuario, quiero que la app no marque una caída por un único ping aislado fallido, para que el estado actual y los incidentes sean confiables.

### Qué cubre esta historia

- confirmación de transición `ok -> down`
- confirmación de transición `down -> ok`
- definición de cuándo empieza y cuándo termina un incidente
- base lógica para las siguientes historias de segmentos, uptime e incidentes

### Decisiones de diseño ya tomadas

- una caída se confirma con `N` fallos consecutivos
- una recuperación se confirma con `M` éxitos consecutivos
- los cambios de segmento dependen del estado confirmado, no de cada muestra individual
- se seguirán guardando las muestras crudas cada 5 segundos
- las transiciones confirmadas se anclan retroactivamente a la primera muestra de la racha candidata
- la sensibilidad es configurable desde settings y aplica sólo hacia adelante
- un microcorte confirmado sí cuenta como incidente real
- el sondeo de providers dentro del ciclo debe ejecutarse en paralelo para sostener la cadencia real de muestras

### Implementado

- estado interno de confirmación y rachas pendientes
- transición confirmada entre estados `ok` y `down`
- snapshot actual basado en estado confirmado
- apertura/cierre de incidentes desde transiciones confirmadas
- settings persistidos para `confirmDownAfter` y `confirmUpAfter`
- tests unitarios de transición y migraciones
- tests de integración de incidentes largos y microcortes
- corrección de `STALE` en UI para no tapar una caída mientras el stream sigue vivo
- corrección de la cadencia real del monitor en caídas totales evitando probes secuenciales

### Dependencias

- ninguna fuerte; esta historia es fundacional

### Resultado para historias siguientes

- existe una fuente de verdad de transiciones confirmadas
- el historial crudo sigue disponible para detalle e inspección fina
- incidentes, segmentos y métricas futuras deben montarse sobre estas reglas

### Qué puede posponerse

- introducir más estados como `degraded`

### Criterio de cierre

- un fallo aislado no cambia el estado
- una recuperación aislada no cierra un incidente
- los incidentes empiezan y terminan con reglas consistentes

## 2. [DONE] Timeline segmentada por cambios de estado

Estado: `hecho`

### Historia / problema

Como usuario, quiero ver bloques continuos de estado en vez de miles de puntos repetidos, para que la timeline sea legible y la UI siga siendo rápida en rangos de 24h, 7d y 30d.

### Qué cubre esta historia

- convertir muestras crudas en segmentos
- reducir la carga del frontend
- definir el modelo principal de visualización histórica

### Decisiones de diseño ya tomadas

- el backend sigue guardando muestras crudas
- la timeline principal debe renderizar segmentos
- si hay 10 minutos de caída, debe verse un bloque rojo continuo
- si hay 8 horas de estado `ok`, debe verse un único bloque continuo
- los segmentos representan cambios de estado confirmados, no cambios por cada muestra

### Qué falta implementar

- modelo `TimelineSegment`
- lógica de derivación `samples -> segments`
- adaptación del endpoint de historial o creación de un endpoint específico de segmentos
- nueva UI para timeline segmentada
- selección/interacción sobre segmentos
- fallback o zoom a detalle crudo si hace falta inspección fina

### Dependencias

- depende de la historia 1 ya cerrada para tener transiciones confirmadas consistentes

### Dudas por aclarar

- si la timeline larga mostrará sólo segmentos o si habrá modo detalle
- si el backend devolverá siempre segmentos o según el rango pedido
- si la selección de un segmento mostrará resumen o lista de muestras internas

### Notas de consistencia

- los segmentos deben derivarse de `monitor_state_transitions` y completar detalle con muestras crudas sólo cuando haga falta
- no usar cambios por muestra individual para abrir/cerrar bloques principales
- la duración visual debe respetar el anclaje retroactivo ya definido en historia 1

### Trabajo diferido

- buckets agregados para rangos muy grandes, si más adelante siguen siendo necesarios
- virtualización avanzada del timeline, si los segmentos no bastan

### Criterio de cierre

- `24h`, `7d` y `30d` dejan de degradar perceptiblemente la UI
- la timeline sigue siendo entendible
- el usuario puede distinguir claramente periodos largos de `ok`, `down` y luego `NO DATA`

## 3. Huecos `NO DATA` y continuidad honesta del historial

### Historia / problema

Como usuario, quiero ver cuándo no hubo medición, para no confundir ausencia de datos con conectividad sana o caída.

### Qué cubre esta historia

- detección de huecos entre muestras
- representación visual de periodos sin datos
- comportamiento cuando el PC estuvo apagado o la app no corrió

### Decisiones de diseño ya tomadas

- si el PC se apaga (o se detiene la app) y luego la app vuelve, ese periodo debe verse como `NO DATA`
- `NO DATA` se mostrará como bloque/segmento explícito en la timeline
- no hace falta llenar la base con filas sintéticas cada 5 segundos
- el hueco puede inferirse al leer el historial

### Qué falta implementar

- regla de detección de gap suficientemente grande
- segmento `NO DATA`
- color y copy consistentes en la UI
- leyenda e inspector adaptados
- tests de hueco entre muestras

### Dependencias

- depende de la historia 2 si `NO DATA` también se expresa como segmento
- debe respetar la semántica ya cerrada: `STALE` no sustituye `DOWN`, y `NO DATA` no debe confundirse con una caída confirmada

### Dudas por aclarar

- umbral exacto para considerar un gap como `NO DATA`
- si habrá diferencia visual entre `NO DATA por pausa voluntaria` y `NO DATA por app apagada`

### Notas de consistencia

- los gaps deben inferirse por ausencia de muestras/transiciones, no por reinterpretar incidentes
- un incidente confirmado puede coexistir con muestras espaciadas; `NO DATA` debe reservarse para ausencia real de medición

### Trabajo diferido

- clasificación más rica de causas de `NO DATA`
- eventos explícitos de lifecycle si se ve necesario

### Criterio de cierre

- un hueco largo no aparece como continuidad falsa
- la timeline muestra un tramo gris explícito de `NO DATA`

## 4. Control `on/off` o `running/paused` del monitor

### Historia / problema

Como usuario, quiero poder pausar o reanudar el monitoreo sin cerrar la app, para controlar cuándo estoy midiendo y que eso quede reflejado en el historial.

### Qué cubre esta historia

- control operativo del monitor
- persistencia o derivación del estado de pausa
- integración con `NO DATA`

### Decisiones de diseño ya tomadas

- la app debe permitir “prender/apagar” el sistema de monitoreo
- cuando el monitor esté apagado o pausado, la timeline debe mostrar `NO DATA`
- se prioriza simplicidad: pausar el monitor, no cerrar toda la app

### Qué falta implementar

- estado operativo del monitor en backend
- endpoint para `pause/resume`
- indicador visible en la UI
- efecto en scheduler/worker
- integración con historial segmentado

### Dependencias

- depende parcialmente de la historia 3 para cómo se ve la pausa en la timeline

### Notas de consistencia

- pausar el monitor debe producir ausencia real de muestras nuevas
- la pausa no debe cerrar incidentes retroactivamente ni generar `ok` sintéticos

### Dudas por aclarar

- si el estado `paused` se persiste explícitamente en DB
- si la pausa debe sobrevivir reinicios de la app/contenedor

### Trabajo diferido

- programación horaria automática
- perfiles de monitoreo

### Criterio de cierre

- el usuario puede pausar y reanudar sin ambigüedad
- la app deja de medir cuando está pausada
- la timeline refleja ese tramo como `NO DATA`

## 5. Packaging oficial con Docker

### Historia / problema

Como usuario, quiero instalar la app rápido y dejarla siempre corriendo, sin tener que arrancarla a mano.

### Qué cubre esta historia

- despliegue reproducible
- persistencia
- arranque automático práctico
- separación entre modo desarrollo y modo “siempre encendido”

### Decisiones de diseño ya tomadas

- Docker es el camino principal de instalación
- el puerto principal de runtime debe ser distinto al de desarrollo
- la base SQLite debe persistirse por volumen
- la app debe seguir siendo local-first y segura por defecto

### Qué falta implementar

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`
- volumen de datos
- path oficial de DB dentro del contenedor
- guía mínima de instalación y actualización

### Dependencias

- ninguna fuerte; puede hacerse en paralelo con otras historias

### Dudas por aclarar

- puerto definitivo por defecto para runtime
- si la imagen será multi-stage o simple
- cómo exponer el bind local de forma segura

### Trabajo diferido

- imagen publicada en registry
- instalador más amigable todavía

### Criterio de cierre

- alguien puede levantar la app con Docker de forma reproducible
- la DB persiste reinicios
- la app puede quedarse corriendo sin intervención manual constante

## 6. Pulido de UI y consolidación visual

### Historia / problema

Como usuario, quiero una interfaz clara, consistente y rápida, que se sienta como herramienta técnica seria y no como dashboard genérico.

### Qué cubre esta historia

- coherencia con `DESIGN.md`
- semántica visual del estado
- responsive
- empty/error/loading states

### Decisiones de diseño ya tomadas

- la UI debe ser sobria y utilitaria
- no se quiere inflarla con visualizaciones innecesarias
- el sistema de diseño actual es buena dirección, pero no está consolidado

### Qué falta implementar o pulir

- revisar uso real de tipografías
- homogenizar superficies y jerarquía visual
- eliminar discrepancias de copy y estado
- aclarar el rol del toggle live
- mejorar timeline, leyenda e inspector con segmentos y `NO DATA`
- hacer un pase responsive serio

### Dependencias

- depende parcialmente de las historias 2 y 3, porque la timeline cambiará

### Notas de consistencia

- la UI debe distinguir visualmente `DOWN`, `STALE` y futuro `NO DATA` sin solaparlos semánticamente
- cualquier copy sobre incidente actual debe hablar de conectividad confirmada, no de una muestra aislada

### Dudas por aclarar

- si la timeline tendrá modo detalle adicional
- si `logoUrl` custom sigue aportando o sobra

### Trabajo diferido

- microinteracciones sofisticadas
- temas alternativos

### Criterio de cierre

- la UI se ve consistente entre dashboard, incidents y providers
- la app sigue sintiéndose ligera y rápida

## 7. Refactors de base y consolidación técnica

### Historia / problema

Como mantenedor, quiero una base de código más limpia y menos duplicada, para poder iterar sin que cada cambio cueste demasiado.

### Qué cubre esta historia

- duplicaciones frontend
- cohesión de servicios
- limpieza de restos de scope antiguo
- migraciones y tooling

### Decisiones de diseño ya tomadas

- no se quiere crecer desordenadamente
- vale la pena invertir en refactor antes de llamar esto 1.0

### Qué falta implementar

- extraer hook/capa compartida para bootstrap + stream
- compartir formateadores y helpers
- revisar modelo de historial y contratos
- limpiar artefactos `.vite`
- dejar `lint` en verde sin depender de artefactos generados
- mejorar migraciones

### Dependencias

- conviene hacerlo después de cerrar decisiones principales de producto

### Dudas por aclarar

- cuánto refactor hacer antes de 1.0 y cuánto después

### Trabajo diferido

- reorganización más profunda de arquitectura si no bloquea la 1.0

### Criterio de cierre

- cambios futuros cuestan menos
- la base está alineada con el producto real

## 8. Seguridad y hardening local-first

### Historia / problema

Como usuario, quiero que la app no abra vulnerabilidades innecesarias en el equipo donde corre.

### Qué cubre esta historia

- superficie de red
- validación de inputs
- contenedor con mínimos privilegios
- disciplina de configuración

### Decisiones de diseño ya tomadas

- local-first
- bind local por defecto
- sin acceso remoto abierto
- sin auth compleja para 1.0
- mínima superficie web

### Qué falta implementar

- bind explícito a `127.0.0.1` por defecto
- validación estricta de inputs
- revisión de providers custom
- revisar `logoUrl` custom por impacto de seguridad y privacidad
- Docker con privilegios mínimos
- variables y configuración documentadas

### Dependencias

- algunas decisiones dependen del packaging Docker

### Dudas por aclarar

- si `logoUrl` custom se mantiene o se reduce
- si la exposición por red local será posible sólo por config avanzada

### Trabajo diferido

- auth o exposición remota, si alguna vez se quisiera, no va en 1.0

### Criterio de cierre

- la app no queda expuesta accidentalmente
- no se aceptan inputs inseguros
- Docker no usa privilegios de más

## Orden sugerido de ejecución

1. Modelo de estado y confirmación de incidentes
2. Timeline segmentada
3. `NO DATA` y continuidad honesta
4. Control `on/off`
5. Resúmenes útiles
6. Docker oficial
7. Pulido de UI
8. Refactors de consolidación
9. Exportación simple
10. Hardening de seguridad final

## Dependencias clave entre historias

- La historia 1 desbloquea bien las historias 2 y 5.
- La historia 2 facilita resolver de forma limpia la 3.
- La historia 3 se conecta naturalmente con la 4.
- La historia 8 debe ejecutarse después de fijar el modelo final de timeline.
- La historia 10 debe acompañar especialmente a la 7.

## Definición de terminado de la 1.0.0

La 1.0.0 está lista cuando:

- la app se instala por Docker de forma sencilla
- el monitor puede quedarse corriendo siempre
- el estado actual es confiable
- los incidentes tienen menos falsos positivos
- la timeline usa segmentos y no se degrada con rangos largos
- los huecos sin medición aparecen como `NO DATA`
- existe control simple `on/off`
- hay uptime/downtime resumido
- la UI está pulida y consistente
- el bind es local por defecto
- la validación de inputs es razonable
- `typecheck`, `build` y `lint` pasan

## Nota final

La clave de esta 1.0.0 no es añadir muchas cosas. Es cerrar bien unas pocas:

- fiabilidad del estado
- claridad del historial
- instalación simple
- UI sobria
- seguridad por defecto
