import type { GapEvent } from "../../types";

export function WhitespacePanel({ gaps }: { gaps: GapEvent[] }) {
  const whitespace = gaps.filter((gap) => gap.gapType === "whitespace");
  const exclusion = gaps.filter((gap) => gap.gapType === "prompt_exclusion");
  const praise = gaps.filter((gap) => gap.gapType === "feature_praise_gap");

  return (
    <section className="panel">
      <h3 className="panel__title">Whitespace Opportunities</h3>
      <p className="panel__hint" style={{ marginBottom: 16 }}>
        Categories and prompts where AI assistants don&rsquo;t firmly recommend any brand yet.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Stat label="Whitespace" value={whitespace.length} />
        <Stat label="Exclusion gaps" value={exclusion.length} />
        <Stat label="Praise gaps" value={praise.length} />
      </div>

      {whitespace.length > 0 && (
        <ul className="bullets">
          {whitespace.map((gap) => (
            <li key={gap.id}>
              Category <em>{gap.categoryKey ?? "general"}</em> — no brand owns the consensus answer.
              {gap.evidence[0] && (
                <span style={{ color: "var(--pp-ink-3)" }}> {gap.evidence[0]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid var(--pp-rule)",
        borderRadius: "var(--pp-radius)",
        padding: "10px 12px",
        background: "var(--pp-paper)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--pp-font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--pp-ink-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--pp-font-display)",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
