import type { GapEvent } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhitespacePanel({ gaps }: { gaps: GapEvent[] }) {
  const whitespace = gaps.filter((gap) => gap.gapType === "whitespace");
  const exclusion = gaps.filter((gap) => gap.gapType === "prompt_exclusion");
  const praise = gaps.filter((gap) => gap.gapType === "feature_praise_gap");

  return (
    <div className="whitespace-block">
      <div className="stat-row">
        <Stat label="Whitespace" value={whitespace.length} />
        <Stat label="Exclusion gaps" value={exclusion.length} />
        <Stat label="Praise gaps" value={praise.length} />
      </div>
      {whitespace.length > 0 && (
        <ul className="bullet-list">
          {whitespace.map((gap) => (
            <li key={gap.id}>
              Category <em>{gap.categoryKey ?? "general"}</em> — no brand owns the consensus answer.
              {gap.evidence[0] && <span className="muted"> {gap.evidence[0]}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
