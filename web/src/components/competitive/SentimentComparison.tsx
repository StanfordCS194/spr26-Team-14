import type { OverviewRow } from "../../types";

export function SentimentComparison({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  const sorted = [...rows].sort((a, b) => b.sentiment - a.sentiment);

  return (
    <section className="panel">
      <h3>Sentiment</h3>
      <p className="muted">Where each brand sits on a -1 to +1 valence axis.</p>
      <div className="metric-list">
        {sorted.map((row) => {
          const pct = ((row.sentiment + 1) / 2) * 100;
          const tone =
            row.sentiment >= 0.25
              ? "var(--success)"
              : row.sentiment <= -0.25
                ? "var(--danger)"
                : "var(--ink)";
          return (
            <div className="metric-row" key={row.brandId}>
              <span className="metric-row__label">{label(row.brandId)}</span>
              <span className="sentiment-gauge" aria-hidden="true">
                <span className="sentiment-gauge__pin" style={{ left: `${pct}%`, background: tone }} />
              </span>
              <span className="metric-row__num" style={{ color: tone }}>
                {row.sentiment.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
