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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Sentiment Comparison</h3>
      <table width="100%">
        <thead>
          <tr>
            <th align="left">Brand</th>
            <th align="right">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId}>
              <td>{label(row.brandId)}</td>
              <td align="right">{row.sentiment.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
