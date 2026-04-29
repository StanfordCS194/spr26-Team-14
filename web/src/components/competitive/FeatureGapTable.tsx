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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Feature Strengths & Weaknesses</h3>
      <table width="100%" style={{ marginBottom: 16 }}>
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
        <ul>
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
