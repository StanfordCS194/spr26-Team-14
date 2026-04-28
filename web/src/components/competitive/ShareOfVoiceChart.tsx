import type { OverviewRow } from "../../types";

export function ShareOfVoiceChart({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  return (
    <section className="panel">
      <h3>Share of Voice</h3>
      {rows.map((row) => (
        <div className="metric-row" key={row.brandId}>
          <strong>{label(row.brandId)}</strong>
          <div className="metric-track" aria-hidden="true">
            <div className="metric-fill" style={{ width: `${Math.max(row.shareOfVoice * 100, 4)}%` }} />
          </div>
          <span>{(row.shareOfVoice * 100).toFixed(1)}%</span>
        </div>
      ))}
    </section>
  );
}
