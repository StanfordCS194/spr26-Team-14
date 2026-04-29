import type { GapEvent } from "../../types";

export function WhitespacePanel({ gaps }: { gaps: GapEvent[] }) {
  const whitespace = gaps.filter((gap) => gap.gapType === "whitespace");
  const exclusion = gaps.filter((gap) => gap.gapType === "prompt_exclusion");

  return (
    <section className="panel">
      <h3>Gap Analysis Highlights</h3>
      <p>
        Prompt Exclusion Gaps: <strong>{exclusion.length}</strong>
      </p>
      <p>
        Whitespace Opportunities: <strong>{whitespace.length}</strong>
      </p>
      {whitespace.length > 0 && (
        <ul className="gap-list">
          {whitespace.map((gap) => (
            <li key={gap.id}>
              Prompt run {gap.promptRunId} has no recommended brand; category {gap.categoryKey ?? "general"}.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
