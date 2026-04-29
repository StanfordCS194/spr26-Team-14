import type { GapEvent, OverviewRow } from "../../types";

interface Props {
  rows: OverviewRow[];
  gaps: GapEvent[];
  brandLabels?: Record<string, string>;
  accountBrandName?: string;
}

export function FeatureGapTable({ rows, gaps, brandLabels, accountBrandName = "Your brand" }: Props) {
  const praiseGaps = gaps.filter((gap) => gap.gapType === "feature_praise_gap");
  const label = (id: string) => brandLabels?.[id] ?? id;

  return (
    <section className="panel">
      <h3 className="panel__title">Feature strengths</h3>
      <p className="panel__hint" style={{ marginBottom: 16 }}>
        The themes the judge LLM repeatedly attached to each brand across the 20 perception prompts.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: "30%" }}>Brand</th>
            <th>Top features</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId}>
              <td>{label(row.brandId)}</td>
              <td>
                {row.topFeatures.length === 0 ? (
                  <span style={{ color: "var(--pp-ink-4)", fontStyle: "italic" }}>No feature signal yet</span>
                ) : (
                  <span className="tag-row">
                    {row.topFeatures.map((feature) => (
                      <span className="tag" key={feature}>{feature}</span>
                    ))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="subhead">Feature praise gaps</div>
      {praiseGaps.length === 0 ? (
        <p style={{ color: "var(--pp-ink-3)", margin: 0, fontSize: 14 }}>
          No feature praise gaps detected in this window.
        </p>
      ) : (
        <ul className="bullets">
          {praiseGaps.map((gap) => (
            <li key={gap.id}>
              <strong>{gap.competitorBrandId ? label(gap.competitorBrandId) : "Competitor"}</strong> is praised on{" "}
              <em>{gap.featureKey}</em>; {accountBrandName}&rsquo;s equivalent is unmentioned.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
