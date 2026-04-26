import { useEffect, useMemo, useState } from "react";

interface Props {
  onCreate: (input: { accountBrandName: string; competitorNames: string[] }) => Promise<void>;
  accountBrandName?: string;
  busy?: boolean;
  competitorNames?: string[];
  onSave?: (names: string[]) => Promise<void>;
}

/** Demo cohort: Sephora vs five beauty retail competitors */
const DEFAULT_ACCOUNT = "Sephora";
const DEFAULT_COMPETITORS = ["Ulta", "Bluemercury", "SpaceNK", "SallyBeauty", "Olive Young"];

export function CompetitiveSetPicker({
  accountBrandName: initialAccountBrandName = DEFAULT_ACCOUNT,
  busy,
  competitorNames: savedCompetitors,
  onCreate,
  onSave,
}: Props) {
  const [accountBrandName, setAccountBrandName] = useState(initialAccountBrandName);
  const [competitorNames, setCompetitorNames] = useState<string[]>(savedCompetitors ?? DEFAULT_COMPETITORS);

  useEffect(() => setAccountBrandName(initialAccountBrandName), [initialAccountBrandName]);
  useEffect(() => setCompetitorNames(savedCompetitors ?? DEFAULT_COMPETITORS), [savedCompetitors]);

  const canSubmit = useMemo(() => {
    return accountBrandName.trim().length > 0 && competitorNames.every((name) => name.trim().length > 0);
  }, [accountBrandName, competitorNames]);

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Competitive Set — Demo (5 competitors)</h3>
      <label style={{ display: "block", marginBottom: 8 }}>
        Your brand
        <input
          value={accountBrandName}
          onChange={(e) => setAccountBrandName(e.target.value)}
          style={{ width: "100%", marginTop: 4 }}
        />
      </label>
      {competitorNames.map((name, idx) => (
        <label key={idx} style={{ display: "block", marginBottom: 8 }}>
          Competitor {idx + 1}
          <input
            value={name}
            onChange={(e) => {
              const next = [...competitorNames];
              next[idx] = e.target.value;
              setCompetitorNames(next);
            }}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onSave?.(competitorNames)} disabled={!canSubmit || busy || !onSave}>
          Save competitors
        </button>
        <button
          type="button"
          onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
          disabled={!canSubmit || busy}
        >
          {busy ? "Running 20-question benchmark..." : "Run benchmark"}
        </button>
      </div>
      {busy && (
        <p style={{ marginBottom: 0, color: "#555" }}>
          Generating brand-perception summaries and comparisons. This can take a bit while the server fans out the LLM
          calls.
        </p>
      )}
    </section>
  );
}
