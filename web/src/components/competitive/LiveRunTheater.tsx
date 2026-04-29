import { useMemo } from "react";

const TOTAL_PROMPTS_PER_BRAND = 20;

const BRAND_ACCENTS = ["#b3251f", "#1f5fa8", "#2f8a4d", "#a76b1f", "#5d3a8b", "#1f7a83"];

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
  const brandEntries = useMemo(() => Object.entries(progressByBrand), [progressByBrand]);
  const visible = brandEntries.length > 0 || judgeLines.length > 0 || busy;
  if (!visible) {
    return null;
  }

  return (
    <section className="theater">
      <style>{theaterStyles}</style>
      <header className="theater__header">
        <h3 className="theater__title">Live Run Theater</h3>
        <p className="theater__status">{progressStatus}</p>
      </header>

      {judgeLines.length > 0 && (
        <aside className="theater__judge">
          <span className="theater__judge-label">Judge</span>
          <pre className="theater__judge-text">{judgeLines.join("\n")}</pre>
        </aside>
      )}

      <div className="theater__columns">
        {brandEntries.map(([brandId, box], index) => {
          const accent = BRAND_ACCENTS[index % BRAND_ACCENTS.length];
          const streaming = isStreaming(box);
          const pct = progressPct(box);
          return (
            <article key={brandId} className="theater__column" style={{ borderTopColor: accent }}>
              <div className="theater__column-head">
                <h4 className="theater__column-title">{box.brandName}</h4>
                <span className="theater__column-count">
                  {box.completedPrompts}/{TOTAL_PROMPTS_PER_BRAND}
                </span>
              </div>
              <div className="theater__progress">
                <div className="theater__progress-bar" style={{ width: `${pct}%`, background: accent }} />
              </div>
              <p className="theater__column-status">{box.status}</p>
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

const theaterStyles = `
.theater {
  margin-bottom: 16px;
  border: 1px solid #e6e0d4;
  border-radius: 10px;
  padding: 18px 20px 22px;
  background:
    radial-gradient(circle at 12% -10%, rgba(179, 37, 31, 0.06), transparent 55%),
    radial-gradient(circle at 110% 110%, rgba(31, 95, 168, 0.05), transparent 60%),
    #fbf8f1;
  font-family: "Iowan Old Style", "Hoefler Text", "Source Serif Pro", Georgia, serif;
  color: #1f1b16;
}
.theater__header { margin-bottom: 14px; }
.theater__title {
  margin: 0 0 4px;
  font-size: 22px;
  letter-spacing: 0.01em;
  font-weight: 600;
}
.theater__status {
  margin: 0;
  font-family: "JetBrains Mono", "Menlo", "SFMono-Regular", monospace;
  font-size: 12px;
  color: #5b5347;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.theater__judge {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(31, 27, 22, 0.04);
  border: 1px dashed rgba(31, 27, 22, 0.18);
}
.theater__judge-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #5b5347;
  margin-bottom: 4px;
}
.theater__judge-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: "JetBrains Mono", "Menlo", "SFMono-Regular", monospace;
  font-size: 12px;
  line-height: 1.45;
  color: #2c261d;
}
.theater__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.theater__column {
  border: 1px solid #ece4d3;
  border-top: 3px solid currentColor;
  border-radius: 8px;
  padding: 12px 14px 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 220px;
  box-shadow: 0 1px 0 rgba(31, 27, 22, 0.04);
}
.theater__column-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.theater__column-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.theater__column-count {
  font-family: "JetBrains Mono", "Menlo", "SFMono-Regular", monospace;
  font-size: 11px;
  color: #5b5347;
  letter-spacing: 0.06em;
}
.theater__progress {
  margin: 8px 0 6px;
  height: 3px;
  background: rgba(31, 27, 22, 0.08);
  border-radius: 2px;
  overflow: hidden;
}
.theater__progress-bar {
  height: 100%;
  transition: width 240ms ease-out;
}
.theater__column-status {
  margin: 0 0 8px;
  font-family: "JetBrains Mono", "Menlo", "SFMono-Regular", monospace;
  font-size: 11px;
  color: #5b5347;
  letter-spacing: 0.04em;
  min-height: 1.4em;
}
.theater__stream {
  margin: 0;
  flex-grow: 1;
  white-space: pre-wrap;
  font-family: "JetBrains Mono", "Menlo", "SFMono-Regular", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #1f1b16;
}
.theater__stream[data-empty="true"] {
  color: #a39a87;
  font-style: italic;
}
.theater__cursor {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -2px;
  animation: theaterBlink 1s steps(2, end) infinite;
}
@keyframes theaterBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
`;
