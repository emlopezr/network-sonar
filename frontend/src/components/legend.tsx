export function Legend({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <ul className="legend legend--compact" role="list" aria-label="Status legend">
        <li>
          <i className="legend__swatch legend__swatch--ok" aria-hidden="true" />
          <span>Operational</span>
        </li>
        <li>
          <i className="legend__swatch legend__swatch--down" aria-hidden="true" />
          <span>No Connection</span>
        </li>
        <li>
          <i className="legend__swatch legend__swatch--stale" aria-hidden="true" />
          <span>No Data</span>
        </li>
      </ul>
    );
  }

  return (
    <ul className="legend" role="list" aria-label="Status legend">
      <li>
        <i className="legend__swatch legend__swatch--ok" aria-hidden="true" />
        <span>
          <strong>Operational</strong>
          The external target is responding within the normal sampling cadence.
        </span>
      </li>
      <li>
        <i className="legend__swatch legend__swatch--down" aria-hidden="true" />
        <span>
          <strong>Offline</strong>
          Connectivity loss detected by the local probe.
        </span>
      </li>
      <li>
        <i className="legend__swatch legend__swatch--stale" aria-hidden="true" />
        <span>
          <strong>No Data</strong>
          No real measurement was recorded during that period.
        </span>
      </li>
    </ul>
  );
}
