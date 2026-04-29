import type { OverviewRow } from "../../types";

const BRAND_VARS = [
  "var(--brand-1)",
  "var(--brand-2)",
  "var(--brand-3)",
  "var(--brand-4)",
  "var(--brand-5)",
  "var(--brand-6)",
];

export function ShareOfVoiceChart({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  const sorted = [...rows].sort((a, b) => b.shareOfVoice - a.shareOfVoice);
  const max = Math.max(0.001, ...sorted.map((row) => row.shareOfVoice));

  return (
    <section className="card">
      <h3>Share of voice</h3>
      <p className="muted">Comparative narrative weight across all 20 perception prompts.</p>
      <div className="metric-list">
        {sorted.map((row, idx) => (
          <div className="metric-row" key={row.brandId}>
            <span className="metric-row__label">{label(row.brandId)}</span>
            <span className="metric-row__bar">
              <span
                className="metric-row__fill"
                style={{
                  width: `${Math.max((row.shareOfVoice / max) * 100, 4)}%`,
                  background: BRAND_VARS[idx % BRAND_VARS.length],
                }}
              />
            </span>
            <span className="metric-row__num">{(row.shareOfVoice * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
