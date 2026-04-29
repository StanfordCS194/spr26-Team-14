import type { OverviewRow } from "../../types";

export function SentimentComparison({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  return (
    <section className="panel">
      <h3>Sentiment Comparison</h3>
      {rows.map((row) => {
        const score = ((row.sentiment + 1) / 2) * 100;
        return (
          <div className="metric-row" key={row.brandId}>
            <strong>{label(row.brandId)}</strong>
            <div className="metric-track" aria-hidden="true">
              <div className="metric-fill" style={{ width: `${Math.max(score, 4)}%` }} />
            </div>
            <span>{row.sentiment.toFixed(2)}</span>
          </div>
        );
      })}
    </section>
  );
}
