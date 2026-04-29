import { useMemo, useState } from "react";

interface Props {
  onCreate: (input: { accountBrandName: string; competitorNames: string[] }) => Promise<void>;
  busy?: boolean;
}

/** Demo cohort: Sephora vs five beauty retail competitors */
const DEFAULT_ACCOUNT = "Sephora";
const DEFAULT_COMPETITORS = ["Ulta", "Bluemercury", "SpaceNK", "SallyBeauty", "Olive Young"];

export function CompetitiveSetPicker({ onCreate, busy }: Props) {
  const [accountBrandName, setAccountBrandName] = useState(DEFAULT_ACCOUNT);
  const [competitorNames, setCompetitorNames] = useState<string[]>(DEFAULT_COMPETITORS);

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
      <button
        type="button"
        onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
        disabled={!canSubmit || busy}
      >
        {busy ? "Running 20-question benchmark..." : "Run benchmark"}
      </button>
      {busy && (
        <p style={{ marginBottom: 0, color: "#555" }}>
          Generating brand-perception summaries and comparisons. This can take a bit while the server fans out the LLM
          calls.
        </p>
      )}
    </section>
  );
}
