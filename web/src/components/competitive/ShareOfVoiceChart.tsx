import type { OverviewRow } from "../../types";

const BRAND_VARS = [
  "var(--pp-brand-1)",
  "var(--pp-brand-2)",
  "var(--pp-brand-3)",
  "var(--pp-brand-4)",
  "var(--pp-brand-5)",
  "var(--pp-brand-6)",
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
    <section className="panel">
      <h3 className="panel__title">Share of voice</h3>
      <p className="panel__hint" style={{ marginBottom: 16 }}>
        Comparative narrative weight across all twenty prompts.
      </p>
      <table className="data-table">
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.brandId}>
              <td>
                <div className="bar-row">
                  <span className="bar-row__label">{label(row.brandId)}</span>
                  <span className="bar-row__bar">
                    <span
                      className="bar-row__bar-fill"
                      style={{
                        width: `${(row.shareOfVoice / max) * 100}%`,
                        background: BRAND_VARS[idx % BRAND_VARS.length],
                      }}
                    />
                  </span>
                  <span className="bar-row__num">{(row.shareOfVoice * 100).toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
