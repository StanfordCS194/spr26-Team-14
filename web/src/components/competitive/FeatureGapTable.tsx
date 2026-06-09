import type { GapEvent, OverviewRow } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Brand</TableHead>
            <TableHead>Top features</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.brandId}>
              <TableCell><strong>{label(row.brandId)}</strong></TableCell>
              <TableCell>
                {row.topFeatures.length === 0 ? (
                  <span className="muted" style={{ fontStyle: "italic" }}>No feature signal yet</span>
                ) : (
                  <span className="flex flex-wrap gap-1.5">
                    {row.topFeatures.map((feature) => (
                      <Badge variant="secondary" key={feature}>{feature}</Badge>
                    ))}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
