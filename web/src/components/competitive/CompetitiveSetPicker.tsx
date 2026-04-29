import { useMemo, useState } from "react";

interface Props {
  onCreate: (input: { accountBrandName: string; competitorNames: string[] }) => Promise<void>;
  busy?: boolean;
}

const DEFAULT_ACCOUNT = "Sephora";
const DEFAULT_COMPETITORS = ["Ulta", "Bluemercury", "SpaceNK", "SallyBeauty", "Olive Young"];

export function CompetitiveSetPicker({ onCreate, busy }: Props) {
  const [accountBrandName, setAccountBrandName] = useState(DEFAULT_ACCOUNT);
  const [competitorNames, setCompetitorNames] = useState<string[]>(DEFAULT_COMPETITORS);

  const canSubmit = useMemo(() => {
    return accountBrandName.trim().length > 0 && competitorNames.every((name) => name.trim().length > 0);
  }, [accountBrandName, competitorNames]);

  return (
    <div className="panel panel--paper" aria-busy={busy}>
      <p className="panel__title">Configure your benchmark</p>
      <p className="panel__hint" style={{ marginBottom: 18 }}>
        Pick your brand and five competitors. We&rsquo;ll fan twenty perception prompts across every brand and
        compare the answers.
      </p>

      <label className="field">
        <span className="field__label">Your brand</span>
        <input
          className="field__input"
          value={accountBrandName}
          onChange={(e) => setAccountBrandName(e.target.value)}
          placeholder="e.g. Sephora"
          spellCheck={false}
        />
      </label>

      <div className="subhead" style={{ marginTop: 18 }}>Competitive set · 5 brands</div>
      <div className="fieldset-grid">
        {competitorNames.map((name, idx) => (
          <label className="field" key={idx} style={{ marginBottom: 0 }}>
            <span className="field__label">Competitor {idx + 1}</span>
            <input
              className="field__input"
              value={name}
              onChange={(e) => {
                const next = [...competitorNames];
                next[idx] = e.target.value;
                setCompetitorNames(next);
              }}
              spellCheck={false}
            />
          </label>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22 }}>
        <button
          type="button"
          className="btn"
          onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
          disabled={!canSubmit || busy}
        >
          {busy ? "Running 20-prompt benchmark…" : "Run benchmark"}
        </button>
        {busy && (
          <span style={{ fontFamily: "var(--pp-font-mono)", fontSize: 12, color: "var(--pp-ink-3)" }}>
            Streaming brand summaries and judge comparisons in parallel.
          </span>
        )}
      </div>
    </div>
  );
}
