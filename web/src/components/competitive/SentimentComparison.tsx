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
      <h3 className="panel__title">Sentiment</h3>
      <p className="panel__hint" style={{ marginBottom: 16 }}>
        Where each brand sits on a -1 to +1 valence axis (averaged across all prompts).
      </p>
      <table className="data-table">
        <tbody>
          {sorted.map((row) => {
            const pct = ((row.sentiment + 1) / 2) * 100;
            const tone =
              row.sentiment >= 0.25 ? "var(--pp-success)" : row.sentiment <= -0.25 ? "var(--pp-accent)" : "var(--pp-ink)";
            return (
              <tr key={row.brandId}>
                <td>
                  <div className="bar-row">
                    <span className="bar-row__label">{label(row.brandId)}</span>
                    <span className="gauge" style={{ flexGrow: 1 }}>
                      <span className="gauge__pin" style={{ left: `${pct}%`, background: tone }} />
                    </span>
                    <span className="bar-row__num" style={{ color: tone }}>
                      {row.sentiment.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
