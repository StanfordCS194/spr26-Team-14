import type { GapEvent } from "../../types";
import { Stat, StatRow } from "@/components/dashboard";

export function WhitespacePanel({ gaps }: { gaps: GapEvent[] }) {
  const whitespace = gaps.filter((gap) => gap.gapType === "whitespace");
  const exclusion = gaps.filter((gap) => gap.gapType === "prompt_exclusion");
  const praise = gaps.filter((gap) => gap.gapType === "feature_praise_gap");

  return (
    <div className="grid gap-4">
      <StatRow>
        <Stat label="Whitespace" value={whitespace.length} />
        <Stat label="Exclusion gaps" value={exclusion.length} />
        <Stat label="Praise gaps" value={praise.length} />
      </StatRow>
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
