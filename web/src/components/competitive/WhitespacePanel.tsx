import type { GapEvent } from "../../types";

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
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}
