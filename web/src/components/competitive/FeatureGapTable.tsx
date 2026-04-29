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
    <div className="feature-block">
      <table className="feature-table">
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

      {praiseGaps.length > 0 && (
        <>
          <h4 className="subhead">Feature praise gaps</h4>
          <ul className="bullet-list">
            {praiseGaps.map((gap) => (
              <li key={gap.id}>
                <strong>{gap.competitorBrandId ? label(gap.competitorBrandId) : "Competitor"}</strong> is praised on{" "}
                <em>{gap.featureKey}</em>; {accountBrandName}&rsquo;s equivalent is unmentioned.
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
