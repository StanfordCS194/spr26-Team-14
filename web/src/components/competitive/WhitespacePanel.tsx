import type { GapEvent } from "../../types";

export function WhitespacePanel({ gaps }: { gaps: GapEvent[] }) {
  const whitespace = gaps.filter((gap) => gap.gapType === "whitespace");
  const exclusion = gaps.filter((gap) => gap.gapType === "prompt_exclusion");

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Gap Analysis Highlights</h3>
      <p>
        Prompt Exclusion Gaps: <strong>{exclusion.length}</strong>
      </p>
      <p>
        Whitespace Opportunities: <strong>{whitespace.length}</strong>
      </p>
      {whitespace.length > 0 && (
        <ul>
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
