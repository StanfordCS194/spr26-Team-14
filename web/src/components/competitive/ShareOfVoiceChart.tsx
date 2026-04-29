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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Share of Voice</h3>
      <table width="100%">
        <thead>
          <tr>
            <th align="left">Brand</th>
            <th align="right">SOV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId}>
              <td>{label(row.brandId)}</td>
              <td align="right">{(row.shareOfVoice * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
