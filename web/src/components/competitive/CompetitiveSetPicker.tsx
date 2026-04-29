import { useEffect, useMemo, useState } from "react";

interface Props {
  onCreate: (input: { accountBrandName: string; competitorNames: string[] }) => Promise<void>;
  accountBrandName?: string;
  busy?: boolean;
  competitorNames?: string[];
  onSave?: (names: string[]) => Promise<void>;
}

/** Demo cohort: Netflix vs five major streaming competitors */
const DEFAULT_ACCOUNT = "Netflix";
const DEFAULT_COMPETITORS = ["Disney+", "Max", "Amazon Prime Video", "Apple TV+", "Paramount+"];

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
    <section className="panel wide-panel picker">
      <div className="picker__head">
        <h3>Competitive set</h3>
        <span className="picker__count">5 competitors</span>
      </div>
      <p className="muted picker__hint">
        Pick your brand and five competitors. We&rsquo;ll fan twenty perception prompts across every brand and
        compare the answers.
      </p>

      <div className="picker__field picker__field--solo">
        <label className="picker__label">Your brand</label>
        <input
          className="picker__input"
          value={accountBrandName}
          onChange={(e) => setAccountBrandName(e.target.value)}
          placeholder="e.g. Netflix"
          spellCheck={false}
        />
      </div>

      <div className="picker__competitors">
        {competitorNames.map((name, idx) => (
          <div className="picker__field" key={idx}>
            <label className="picker__label">
              <span className="picker__num">{idx + 1}</span>
              Competitor
            </label>
            <input
              className="picker__input"
              value={name}
              onChange={(e) => {
                const next = [...competitorNames];
                next[idx] = e.target.value;
                setCompetitorNames(next);
              }}
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      <div className="picker__actions">
        <button
          type="button"
          className="picker__primary"
          onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
          disabled={!canSubmit || busy}
        >
          {busy ? "Running benchmark…" : "Run benchmark"}
        </button>
        <button
          type="button"
          className="picker__secondary"
          onClick={() => onSave?.(competitorNames)}
          disabled={!canSubmit || busy || !onSave}
        >
          Save competitors
        </button>
        {busy && (
          <span className="picker__status">
            Streaming brand summaries and judge comparisons in parallel.
          </span>
        )}
      </div>
    </section>
  );
}
