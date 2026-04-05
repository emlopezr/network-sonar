import { ConnectionBadge } from "./connection-badge";
import type { CurrentStatusSnapshot } from "../types/monitor";

type StreamState = "connecting" | "live" | "reconnecting";

function formatDateTime(unixSeconds: number): string {
  if (unixSeconds <= 0) {
    return "Sin datos";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(unixSeconds * 1000));
}

function getDiagnosis(snapshot: CurrentStatusSnapshot): string {
  switch (snapshot.status) {
    case "ok":
      return "El destino externo responde. No hay incidentes activos.";
    case "down":
      return "El ping externo fallo. Se registro una caida de conectividad desde este equipo.";
    case "stale":
      return "No han llegado muestras recientes. Verifica el proceso local o la conexion SSE.";
  }
}

export function StatusCard({
  snapshot,
  streamState,
  lastEventAt
}: {
  snapshot: CurrentStatusSnapshot | null;
  streamState: StreamState;
  lastEventAt: number | null;
}) {
  if (!snapshot) {
    return (
      <section className="panel status-card">
        <p className="eyebrow">Estado actual</p>
        <h1>Esperando la primera muestra</h1>
      </section>
    );
  }

  return (
    <section className="panel status-card">
      <div className="status-card__header">
        <div>
          <p className="eyebrow">Estado actual</p>
          <h1>Supervision de conectividad local</h1>
        </div>
        <ConnectionBadge status={snapshot.status} />
      </div>
      <p className="status-card__summary">{getDiagnosis(snapshot)}</p>
      <dl className="status-card__metrics">
        <div>
          <dt>Destino</dt>
          <dd>{snapshot.externalTarget || "Sin configurar"}</dd>
        </div>
        <div>
          <dt>Latencia</dt>
          <dd>{snapshot.externalLatencyMs === null ? "Sin dato" : `${snapshot.externalLatencyMs} ms`}</dd>
        </div>
        <div>
          <dt>Ultima muestra</dt>
          <dd>{formatDateTime(snapshot.observedAt)}</dd>
        </div>
        <div>
          <dt>Ultimo cambio</dt>
          <dd>{formatDateTime(snapshot.lastChangeAt)}</dd>
        </div>
        <div>
          <dt>Stream</dt>
          <dd>{streamState === "live" ? "En vivo" : streamState === "connecting" ? "Conectando" : "Reconectando"}</dd>
        </div>
        <div>
          <dt>Ultimo heartbeat</dt>
          <dd>{lastEventAt ? formatDateTime(lastEventAt) : "Sin heartbeat"}</dd>
        </div>
      </dl>
      <p className="status-card__detail">
        {snapshot.failureReason
          ? `Ultimo motivo reportado: ${snapshot.failureReason}`
          : "Sin errores recientes en la sonda."}
      </p>
    </section>
  );
}
