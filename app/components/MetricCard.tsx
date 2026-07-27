export function MetricCard({
  name,
  value,
  unit,
  status,
  detail,
}: {
  name: string;
  value: string;
  unit: string;
  status: string;
  detail?: string;
}) {
  const tone = status.toLowerCase().replace("/", "");
  return (
    <article className={`metric-card metric-${name.toLowerCase()}`}>
      <div className="metric-card-head">
        <span className="metric-icon">{name.slice(0, 1)}</span>
        <div><span>DATA STREAM</span><strong>{name}</strong></div>
        <em className={`result-pill result-${tone}`}>{status}</em>
      </div>
      <div className="metric-value"><strong>{value || "—"}</strong><span>{unit}</span></div>
      <div className="metric-trend"><span className={status === "PASS" ? "up" : "flat"}>{status === "PASS" ? "↗" : "→"}</span>{detail || "No stream data"}</div>
    </article>
  );
}
