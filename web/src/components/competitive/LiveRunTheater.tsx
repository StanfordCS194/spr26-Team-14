import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
    <section className="grid gap-4">
      <div className="theater__head">
        <div>
          <Badge variant="secondary">Live Run</Badge>
          <h2 className="mt-2 text-sm font-semibold tracking-tight">All six brands streaming in parallel</h2>
        </div>
        <Badge variant="outline">{progressStatus}</Badge>
      </div>

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
              <Progress value={pct} style={{ "--primary": accent } as React.CSSProperties} aria-label={`${box.brandName} progress`} />
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
