export function Legend() {
  return (
    <div className="legend">
      <span><i className="legend__swatch legend__swatch--ok" /> Operativa</span>
      <span><i className="legend__swatch legend__swatch--down" /> Sin conexion</span>
      <span><i className="legend__swatch legend__swatch--stale" /> Sin datos recientes</span>
    </div>
  );
}
