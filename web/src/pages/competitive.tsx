import { useEffect, useRef, useState } from "react";
import { CompetitiveSetPicker } from "../components/competitive/CompetitiveSetPicker";
import { FeatureGapTable } from "../components/competitive/FeatureGapTable";
import { LiveRunTheater } from "../components/competitive/LiveRunTheater";
import { SentimentComparison } from "../components/competitive/SentimentComparison";
import { ShareOfVoiceChart } from "../components/competitive/ShareOfVoiceChart";
import { WhitespacePanel } from "../components/competitive/WhitespacePanel";
import type { CompetitiveProgressEvent, GapEvent, OverviewResponse, TrendsResponse } from "../types";

interface SnapshotResponse {
  hasData: boolean;
  timeframe: { start: string; end: string };
  brandLabels: Record<string, string>;
  overview: OverviewResponse;
  trends: TrendsResponse;
  gaps: GapEvent[];
  accountBrandId: string | null;
  accountBrandName: string | null;
  competitorBrandIds?: string[];
}

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

export function CompetitivePage({
  businessProfileId,
  businessName,
}: {
  businessProfileId?: string;
  businessName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [accountBrandId, setAccountBrandId] = useState<string>("");
  const [accountBrandName, setAccountBrandName] = useState<string>(businessName ?? "Sephora");
  const [competitorBrandIds, setCompetitorBrandIds] = useState<string[]>([]);
  const [savedCompetitors, setSavedCompetitors] = useState<string[]>([]);
  const [brandLabels, setBrandLabels] = useState<Record<string, string>>({});
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [gaps, setGaps] = useState<GapEvent[]>([]);
  const [error, setError] = useState<string>("");
  const [progressStatus, setProgressStatus] = useState<string>("No run in progress.");
  const [judgeLines, setJudgeLines] = useState<string[]>([]);
  const [progressByBrand, setProgressByBrand] = useState<Record<string, BrandProgressBox>>({});

  const [lastWindow, setLastWindow] = useState<{ windowStart: string; windowEnd: string } | null>(null);
  const progressSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/competitive/snapshot?windowDays=7`)
      .then((res) => (res.ok ? (res.json() as Promise<SnapshotResponse>) : null))
      .then((snap) => {
        if (!snap || cancelled || !snap.hasData) return;
        setOverview(snap.overview);
        setTrends(snap.trends);
        setGaps(snap.gaps);
        setBrandLabels(snap.brandLabels);
        if (snap.accountBrandId) setAccountBrandId(snap.accountBrandId);
        if (snap.competitorBrandIds) setCompetitorBrandIds(snap.competitorBrandIds);
        setLastWindow({ windowStart: snap.timeframe.start, windowEnd: snap.timeframe.end });
      })
      .catch(() => {
        /* leave dashboard empty if snapshot fetch fails */
      });

    return () => {
      cancelled = true;
      progressSourceRef.current?.close();
      progressSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    setAccountBrandName(businessName ?? "Sephora");
  }, [businessName]);

  useEffect(() => {
    if (!businessProfileId) {
      return;
    }
    fetch(`${API_BASE}/business-profiles/${businessProfileId}/competitors`)
      .then((res) => (res.ok ? res.json() : { competitorNames: [] }))
      .then((body: { competitorNames: string[] }) => setSavedCompetitors(body.competitorNames))
      .catch(() => setSavedCompetitors([]));
  }, [businessProfileId]);

  async function saveCompetitors(names: string[]) {
    setSavedCompetitors(names);
    if (!businessProfileId) {
      return;
    }
    await fetch(`${API_BASE}/business-profiles/${businessProfileId}/competitors`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ competitorNames: names.map((name) => name.trim()) }),
    });
  }

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
        setProgressStatus(`Judging ${event.promptKind} prompt...`);
        setJudgeLines((current) => appendLine(current, event.text));
        return;
      }
      case "answer_started": {
        setProgressStatus(`Generating ${event.promptKind} summaries...`);
        setProgressByBrand((current) => {
          const existing = current[event.brandId];
          if (!existing) {
            return current;
          }
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
          if (!existing) {
            return current;
          }
          return {
            ...current,
            [event.brandId]: {
              ...existing,
              status: `Streaming ${event.promptKind} summary...`,
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
          if (!existing) {
            return current;
          }
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
      await saveCompetitors(input.competitorNames);

      const setRes = await fetch(`${API_BASE}/competitive-sets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, businessProfileId }),
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
      setProgressStatus("Connecting progress stream...");
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

  return (
    <>
      <CompetitiveSetPicker
        accountBrandName={businessName}
        busy={busy}
        competitorNames={savedCompetitors.length ? savedCompetitors : undefined}
        onCreate={createSet}
        onSave={saveCompetitors}
      />
      {error && <p className="error">{error}</p>}

      <LiveRunTheater
        busy={busy}
        progressStatus={progressStatus}
        judgeLines={judgeLines}
        progressByBrand={progressByBrand}
      />

      {overview && (
        <>
          <div className="block">
            <h2 className="block__title">At a glance</h2>
            <div className="charts-grid">
              <ShareOfVoiceChart rows={overview.rows} brandLabels={brandLabels} />
              <SentimentComparison rows={overview.rows} brandLabels={brandLabels} />
            </div>
          </div>

          <div className="block">
            <h2 className="block__title">Feature signal &amp; gaps</h2>
            <FeatureGapTable
              rows={overview.rows}
              gaps={gaps}
              brandLabels={brandLabels}
              accountBrandName={accountBrandName}
            />
          </div>

          <div className="block">
            <h2 className="block__title">Whitespace</h2>
            <WhitespacePanel gaps={gaps} />
          </div>
        </>
      )}

      <div className="block">
        <h2 className="block__title">Trend snapshot</h2>
        {!trends || Object.keys(trends.seriesByBrand).length === 0 ? (
          <p className="muted">Run a benchmark to populate trend lines.</p>
        ) : (
          <div className="trend-grid">
            {Object.entries(trends.seriesByBrand).map(([id, pts]) => {
              const byDay = new Map<string, { sov: number; sent: number; n: number }>();
              for (const point of pts) {
                const day = point.t.slice(0, 10);
                const existing = byDay.get(day) ?? { sov: 0, sent: 0, n: 0 };
                byDay.set(day, {
                  sov: existing.sov + point.sov,
                  sent: existing.sent + point.sentiment,
                  n: existing.n + 1,
                });
              }
              const days = Array.from(byDay.entries())
                .map(([day, agg]) => ({ day, sov: agg.sov / agg.n, sent: agg.sent / agg.n }))
                .sort((a, b) => (a.day < b.day ? -1 : 1));

              return (
                <div className="trend-grid__brand" key={id}>
                  <div className="trend-grid__name">{brandLabels[id] ?? id}</div>
                  <table className="trend-mini">
                    <tbody>
                      {days.map((d) => {
                        const sentTone =
                          d.sent >= 0.25 ? "var(--success)" : d.sent <= -0.25 ? "var(--danger)" : "var(--muted)";
                        return (
                          <tr key={d.day}>
                            <td className="trend-mini__day">{d.day.slice(5)}</td>
                            <td>
                              <span className="trend-mini__bar" aria-hidden="true">
                                <span
                                  className="trend-mini__bar-fill"
                                  style={{ width: `${Math.min(100, d.sov * 100)}%` }}
                                />
                              </span>
                            </td>
                            <td className="trend-mini__num">{(d.sov * 100).toFixed(0)}%</td>
                            <td className="trend-mini__sent" style={{ color: sentTone }}>
                              {d.sent >= 0 ? "+" : ""}
                              {d.sent.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="block">
        <h2 className="block__title">Run configuration</h2>
        <dl className="run-meta">
          <div>
            <dt>Account</dt>
            <dd>{accountBrandName}</dd>
          </div>
          <div>
            <dt>Competitors</dt>
            <dd>
              {competitorBrandIds.length
                ? competitorBrandIds.map((id) => brandLabels[id] ?? id).join(", ")
                : "(defaults)"}
            </dd>
          </div>
          <div>
            <dt>Window</dt>
            <dd>{lastWindow ? `${lastWindow.windowStart.slice(0, 10)} → ${lastWindow.windowEnd.slice(0, 10)}` : "—"}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}
