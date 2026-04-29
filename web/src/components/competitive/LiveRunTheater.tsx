import { useMemo } from "react";

const TOTAL_PROMPTS_PER_BRAND = 20;

const BRAND_ACCENTS = ["#1d4ed8", "#db2777", "#7c3aed", "#0891b2", "#d97706", "#059669"];

export interface BrandProgressBox {
  brandName: string;
  status: string;
  activePrompt: string;
  lines: string[];
  completedPrompts: number;
}

interface LiveRunTheaterProps {
  busy: boolean;
  progressStatus: string;
  judgeLines: string[];
  progressByBrand: Record<string, BrandProgressBox>;
}

function isStreaming(box: BrandProgressBox) {
  return box.completedPrompts < TOTAL_PROMPTS_PER_BRAND && box.lines.length > 0;
}

function progressPct(box: BrandProgressBox) {
  return Math.min(100, Math.round((box.completedPrompts / TOTAL_PROMPTS_PER_BRAND) * 100));
}

export function LiveRunTheater({ busy, progressStatus, judgeLines, progressByBrand }: LiveRunTheaterProps) {
  const entries = useMemo(() => Object.entries(progressByBrand), [progressByBrand]);
  if (!busy && entries.length === 0 && judgeLines.length === 0) {
    return null;
  }

  return (
    <section className="theater">
      <header className="theater__head">
        <div>
          <span className="theater__kicker">Live Run</span>
          <h3 className="theater__title">All six brands streaming in parallel</h3>
        </div>
        <span className="theater__status">{progressStatus}</span>
      </header>

      {judgeLines.length > 0 && (
        <aside className="theater__judge">
          <span className="theater__judge-label">Judge LLM</span>
          <pre className="theater__judge-text">{judgeLines.join("\n")}</pre>
        </aside>
      )}

      <div className="theater__columns">
        {entries.map(([brandId, box], idx) => {
          const accent = BRAND_ACCENTS[idx % BRAND_ACCENTS.length];
          const streaming = isStreaming(box);
          const pct = progressPct(box);
          return (
            <article
              key={brandId}
              className="theater__column"
              style={{ borderTopColor: accent } as React.CSSProperties}
            >
              <div className="theater__col-head">
                <h4>{box.brandName}</h4>
                <span className="theater__col-count">
                  {box.completedPrompts}/{TOTAL_PROMPTS_PER_BRAND}
                </span>
              </div>
              <div className="theater__progress" aria-hidden="true">
                <div
                  className="theater__progress-fill"
                  style={{ width: `${pct}%`, background: accent }}
                />
              </div>
              <p className="theater__col-status">{box.status}</p>
              <pre className="theater__stream" data-empty={box.lines.length === 0}>
                {box.lines.length === 0 ? "Waiting for streamed output…" : box.lines.join("\n")}
                {streaming && <span className="theater__cursor" style={{ background: accent }} />}
              </pre>
            </article>
          );
        })}
      </div>
    </section>
  );
}
