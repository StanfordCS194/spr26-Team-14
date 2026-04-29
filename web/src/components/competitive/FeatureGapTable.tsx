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
      <h3>Feature Strengths & Weaknesses</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th align="left">Brand</th>
            <th align="left">Top Features</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId}>
              <td>{label(row.brandId)}</td>
              <td>{row.topFeatures.join(", ") || "No feature signal yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Feature Praise Gaps</h4>
      {praiseGaps.length === 0 ? (
        <p>No feature praise gaps detected.</p>
      ) : (
        <ul className="gap-list">
          {praiseGaps.map((gap) => (
            <li key={gap.id}>
              {gap.competitorBrandId ? label(gap.competitorBrandId) : "Competitor"} praised on &quot;
              {gap.featureKey}&quot; while {accountBrandName}&apos;s equivalent is unmentioned in the judge output.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
