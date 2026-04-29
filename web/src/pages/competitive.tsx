import { useEffect, useRef, useState } from "react";
import { CompetitiveSetPicker } from "../components/competitive/CompetitiveSetPicker";
import { FeatureGapTable } from "../components/competitive/FeatureGapTable";
import { LiveRunTheater } from "../components/competitive/LiveRunTheater";
import { SentimentComparison } from "../components/competitive/SentimentComparison";
import { ShareOfVoiceChart } from "../components/competitive/ShareOfVoiceChart";
import { WhitespacePanel } from "../components/competitive/WhitespacePanel";
import type { CompetitiveProgressEvent, GapEvent, OverviewResponse, TrendsResponse } from "../types";

const API_BASE =
  import.meta.env.DEV === true ? "/api" : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");
const MAX_PROGRESS_LINES = 8;

interface BrandProgressBox {
  brandName: string;
  status: string;
  activePrompt: string;
  lines: string[];
  completedPrompts: number;
}

interface LlmStatus {
  provider: string;
  mode: "live" | "mock";
}

function appendLine(lines: string[], line: string) {
  return [...lines, line].slice(-MAX_PROGRESS_LINES);
}

function createInitialProgressBoxes(labels: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(labels).map(([brandId, brandName]) => [
      brandId,
      {
        brandName,
        status: "Waiting to start",
        activePrompt: "",
        lines: [],
        completedPrompts: 0,
      } satisfies BrandProgressBox,
    ]),
  );
}

export function CompetitivePage() {
  const [busy, setBusy] = useState(false);
  const [accountBrandId, setAccountBrandId] = useState<string>("");
  const [accountBrandName, setAccountBrandName] = useState<string>("Sephora");
  const [competitorBrandIds, setCompetitorBrandIds] = useState<string[]>([]);
  const [brandLabels, setBrandLabels] = useState<Record<string, string>>({});
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [gaps, setGaps] = useState<GapEvent[]>([]);
  const [error, setError] = useState<string>("");
  const [progressStatus, setProgressStatus] = useState<string>("Idle.");
  const [judgeLines, setJudgeLines] = useState<string[]>([]);
  const [progressByBrand, setProgressByBrand] = useState<Record<string, BrandProgressBox>>({});
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [lastWindow, setLastWindow] = useState<{ windowStart: string; windowEnd: string } | null>(null);
  const progressSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/llm/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => body && setLlmStatus(body))
      .catch(() => {
        /* leave null; pill hides */
      });

    return () => {
      progressSourceRef.current?.close();
      progressSourceRef.current = null;
    };
  }, []);

  function closeProgressStream() {
    progressSourceRef.current?.close();
    progressSourceRef.current = null;
  }

  function handleProgressEvent(event: CompetitiveProgressEvent) {
    switch (event.type) {
      case "connected":
      case "run_started":
      case "run_completed":
      case "run_failed": {
        setProgressStatus(event.message);
        if (event.type === "run_completed" || event.type === "run_failed") {
          closeProgressStream();
        }
        return;
      }
      case "judge_started":
      case "judge_completed": {
        setProgressStatus(event.message);
        setJudgeLines((current) => appendLine(current, `${event.promptKind}: ${event.prompt}`));
        return;
      }
      case "judge_delta": {
        setProgressStatus(`Judging ${event.promptKind} prompt…`);
        setJudgeLines((current) => appendLine(current, event.text));
        return;
      }
      case "answer_started": {
        setProgressStatus(`Generating ${event.promptKind} summaries…`);
        setProgressByBrand((current) => {
          const existing = current[event.brandId];
          if (!existing) return current;
          return {
            ...current,
            [event.brandId]: {
              ...existing,
              status: event.message,
              activePrompt: event.prompt,
              lines: appendLine(existing.lines, `Prompt: ${event.prompt}`),
            },
          };
        });
        return;
      }
      case "answer_delta": {
        setProgressByBrand((current) => {
          const existing = current[event.brandId];
          if (!existing) return current;
          return {
            ...current,
            [event.brandId]: {
              ...existing,
              status: `Streaming ${event.promptKind} summary…`,
              activePrompt: event.prompt,
              lines: appendLine(existing.lines, event.text),
            },
          };
        });
        return;
      }
      case "answer_completed": {
        setProgressByBrand((current) => {
          const existing = current[event.brandId];
          if (!existing) return current;
          const completedPrompts = existing.completedPrompts + 1;
          return {
            ...current,
            [event.brandId]: {
              ...existing,
              status: `${event.message} (${completedPrompts}/20 prompts)`,
              activePrompt: event.prompt,
              completedPrompts,
            },
          };
        });
      }
    }
  }

  async function createSet(input: { accountBrandName: string; competitorNames: string[] }) {
    setBusy(true);
    setError("");
    try {
      const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const windowEndAfterRun = () => new Date().toISOString();

      const setRes = await fetch(`${API_BASE}/competitive-sets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!setRes.ok) {
        throw new Error(`Could not create competitive set: ${setRes.status}`);
      }
      const setBody = await setRes.json();
      setAccountBrandId(setBody.accountBrandId);
      setAccountBrandName(input.accountBrandName);
      setCompetitorBrandIds(setBody.competitorBrandIds);
      const labels: Record<string, string> = {
        [setBody.accountBrandId]: input.accountBrandName,
      };
      setBody.competitorBrandIds.forEach((id: string, i: number) => {
        labels[id] = input.competitorNames[i] ?? id;
      });
      setBrandLabels(labels);
      setProgressByBrand(createInitialProgressBoxes(labels));
      setJudgeLines([]);

      closeProgressStream();
      const sessionId = crypto.randomUUID();
      const stream = new EventSource(`${API_BASE}/competitive/stream/${sessionId}`);
      progressSourceRef.current = stream;
      setProgressStatus("Connecting progress stream…");
      stream.onmessage = (message) => {
        handleProgressEvent(JSON.parse(message.data) as CompetitiveProgressEvent);
      };
      stream.onerror = () => {
        setProgressStatus("Progress stream disconnected.");
      };

      const runRes = await fetch(`${API_BASE}/competitive/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          accountBrandId: setBody.accountBrandId,
          competitorBrandIds: setBody.competitorBrandIds,
          models: ["gpt-4.1-mini"],
          windowStart,
          windowEnd: windowEndAfterRun(),
        }),
      });
      if (!runRes.ok) {
        throw new Error(`Benchmark run failed: ${runRes.status}`);
      }

      const queryEnd = windowEndAfterRun();
      setLastWindow({ windowStart, windowEnd: queryEnd });

      const overviewRes = await fetch(
        `${API_BASE}/competitive/overview?windowStart=${encodeURIComponent(
          windowStart,
        )}&windowEnd=${encodeURIComponent(queryEnd)}`,
      );
      if (!overviewRes.ok) {
        throw new Error(`Overview failed: ${overviewRes.status}`);
      }
      setOverview(await overviewRes.json());

      const trendsRes = await fetch(
        `${API_BASE}/competitive/trends?windowStart=${encodeURIComponent(
          windowStart,
        )}&windowEnd=${encodeURIComponent(queryEnd)}`,
      );
      if (!trendsRes.ok) {
        throw new Error(`Trends failed: ${trendsRes.status}`);
      }
      setTrends(await trendsRes.json());

      const gapRes = await fetch(`${API_BASE}/competitive/gaps?accountBrandId=${setBody.accountBrandId}`);
      if (!gapRes.ok) {
        throw new Error(`Gaps failed: ${gapRes.status}`);
      }
      const gapBody = await gapRes.json();
      setGaps(gapBody.gaps ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      setProgressStatus(`Run failed: ${message}`);
      closeProgressStream();
    } finally {
      setBusy(false);
    }
  }

  const totalCompetitors = competitorBrandIds.length || 5;
  const labelsForBrands = brandLabels;

  return (
    <main className="app-shell">
      <header className="app-header fade-in">
        <div className="app-brand">
          <span className="app-brand__mark">P</span>
          <span className="app-brand__name">Perception</span>
          <span className="app-brand__sub">Competitive Intelligence · v0.1</span>
        </div>
        {llmStatus && (
          <span className={`pill pill--${llmStatus.mode}`}>
            <span className="pill__dot" />
            {llmStatus.mode === "live" ? `Live · ${llmStatus.provider}` : "Demo · mock LLM"}
          </span>
        )}
      </header>

      <section className="hero fade-in fade-in--d1">
        <div>
          <p className="hero__eyebrow">Competitive benchmarking</p>
          <h1 className="hero__title">
            How AI <em>actually</em> talks about your brand.
          </h1>
          <p className="hero__lede">
            Perception fans twenty perception prompts across your brand and five competitors, asks ChatGPT,
            Claude, and Gemini-class models to answer each, and rolls the results into share of voice,
            sentiment, and feature gaps you can screenshot and bring to your CMO.
          </p>
        </div>
        <div className="hero__meta">
          <div className="hero__meta-row">
            <span><strong>{totalCompetitors}</strong> competitors</span>
            <span><strong>20</strong> prompts / brand</span>
            <span><strong>7d</strong> trailing window</span>
          </div>
          <div className="hero__meta-row">
            <span>Account · <strong>{accountBrandName}</strong></span>
          </div>
        </div>
      </section>

      {llmStatus?.mode === "mock" && (
        <p className="banner fade-in fade-in--d2">
          Running in demo mode — answers are deterministic mock text. Add{" "}
          <code style={{ fontFamily: "var(--pp-font-mono)" }}>OPENAI_API_KEY</code> to <code>server/.env</code>{" "}
          and restart for live LLM output.
        </p>
      )}

      <div className="grid-side fade-in fade-in--d2">
        <aside>
          <CompetitiveSetPicker onCreate={createSet} busy={busy} />
        </aside>

        <div>
          <LiveRunTheater
            busy={busy}
            progressStatus={progressStatus}
            judgeLines={judgeLines}
            progressByBrand={progressByBrand}
          />

          {error && (
            <div
              className="banner"
              style={{ background: "rgba(179, 37, 31, 0.08)", borderColor: "rgba(179, 37, 31, 0.3)", color: "var(--pp-accent)" }}
            >
              {error}
            </div>
          )}

          {!overview && !busy && (
            <div className="empty">
              <p className="empty__title">No benchmark yet</p>
              <p>Hit “Run benchmark” to fan twenty prompts across all six brands.</p>
            </div>
          )}

          {overview && (
            <>
              <section className="section fade-in fade-in--d3">
                <header className="section__head">
                  <h2 className="section__title">At a glance</h2>
                  <span className="section__kicker">7-day rolling window</span>
                </header>
                <div className="grid-2">
                  <ShareOfVoiceChart rows={overview.rows} brandLabels={labelsForBrands} />
                  <SentimentComparison rows={overview.rows} brandLabels={labelsForBrands} />
                </div>
              </section>

              <section className="section fade-in fade-in--d3">
                <header className="section__head">
                  <h2 className="section__title">Feature signal &amp; gaps</h2>
                  <span className="section__kicker">Judge LLM · top 3 themes / brand</span>
                </header>
                <FeatureGapTable
                  rows={overview.rows}
                  gaps={gaps}
                  brandLabels={labelsForBrands}
                  accountBrandName={accountBrandName}
                />
              </section>

              <section className="section">
                <WhitespacePanel gaps={gaps} />
              </section>
            </>
          )}

          <section className="section">
            <header className="section__head">
              <h2 className="section__title">Trend snapshot</h2>
              <span className="section__kicker">Last 7 days</span>
            </header>
            {!trends || Object.keys(trends.seriesByBrand).length === 0 ? (
              <p className="panel__hint">Run a benchmark to populate trend lines.</p>
            ) : (
              <pre className="trend-list">
                {Object.entries(trends.seriesByBrand)
                  .map(([id, pts]) => {
                    const name = labelsForBrands[id] ?? id;
                    const summary = pts
                      .map(
                        (p) =>
                          `  ${p.t.slice(0, 10)}  sov=${(p.sov * 100).toFixed(1).padStart(5, " ")}%  sent=${p.sentiment.toFixed(2)}`,
                      )
                      .join("\n");
                    return `${name}\n${summary}`;
                  })
                  .join("\n\n")}
              </pre>
            )}
          </section>

          <section className="section">
            <header className="section__head">
              <h2 className="section__title">Run configuration</h2>
              <span className="section__kicker">Last execution</span>
            </header>
            <div
              className="panel--paper panel"
              style={{
                borderTop: "none",
                display: "grid",
                gap: 6,
                fontFamily: "var(--pp-font-mono)",
                fontSize: 12,
                color: "var(--pp-ink-2)",
              }}
            >
              <div>
                <span style={{ color: "var(--pp-ink-3)" }}>account</span> · {accountBrandName}{" "}
                <span style={{ color: "var(--pp-ink-4)" }}>({accountBrandId || "—"})</span>
              </div>
              <div>
                <span style={{ color: "var(--pp-ink-3)" }}>competitors</span> ·{" "}
                {competitorBrandIds.length
                  ? competitorBrandIds.map((id) => labelsForBrands[id] ?? id).join(", ")
                  : "Ulta, Bluemercury, SpaceNK, SallyBeauty, Olive Young (defaults)"}
              </div>
              <div>
                <span style={{ color: "var(--pp-ink-3)" }}>window</span> ·{" "}
                {lastWindow ? `${lastWindow.windowStart} → ${lastWindow.windowEnd}` : "—"}
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="app-footer">
        <span>Perception · brand intelligence for the AI layer</span>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
