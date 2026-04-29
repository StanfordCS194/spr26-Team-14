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
    <section className="panel">
      <h3>Competitive Set</h3>
      <div className="form-grid">
      <label>
        Your brand
        <input
          className="text-input"
          value={accountBrandName}
          onChange={(e) => setAccountBrandName(e.target.value)}
        />
      </label>
      {competitorNames.map((name, idx) => (
        <label key={idx}>
          Competitor {idx + 1}
          <input
            className="text-input"
            value={name}
            onChange={(e) => {
              const next = [...competitorNames];
              next[idx] = e.target.value;
              setCompetitorNames(next);
            }}
          />
        </label>
      ))}
      <button
        className="primary-button"
        type="button"
        onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
        disabled={!canSubmit || busy}
      >
        {busy ? "Running 20-question benchmark..." : "Run benchmark"}
      </button>
      {busy && (
        <p className="muted">
          Generating brand-perception summaries and comparisons. This can take a bit while the server fans out the LLM
          calls.
        </p>
      )}
      </div>
    </section>
  );
}
