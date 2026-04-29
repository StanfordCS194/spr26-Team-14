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
    <section className="panel wide-panel">
      <h3>Feature signal</h3>
      <p className="muted">
        The themes the judge LLM repeatedly attached to each brand across the 20 perception prompts.
      </p>
      <table>
        <thead>
          <tr>
            <th align="left" style={{ width: "30%" }}>Brand</th>
            <th align="left">Top features</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId}>
              <td><strong>{label(row.brandId)}</strong></td>
              <td>
                {row.topFeatures.length === 0 ? (
                  <span className="muted" style={{ fontStyle: "italic" }}>No feature signal yet</span>
                ) : (
                  <span className="chip-row">
                    {row.topFeatures.map((feature) => (
                      <span className="chip" key={feature}>{feature}</span>
                    ))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="subhead">Feature praise gaps</h4>
      {praiseGaps.length === 0 ? (
        <p className="muted">No feature praise gaps detected in this window.</p>
      ) : (
        <ul className="bullet-list">
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
