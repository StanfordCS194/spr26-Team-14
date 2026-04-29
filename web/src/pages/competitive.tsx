import { useEffect, useRef, useState } from "react";
import { CompetitiveSetPicker } from "../components/competitive/CompetitiveSetPicker";
import { FeatureGapTable } from "../components/competitive/FeatureGapTable";
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
    return () => {
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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "Inter, Arial, sans-serif" }}>
      <h1>Competitive Benchmarking</h1>
      <p style={{ marginTop: 0 }}>
        Each run uses <strong>10 brand-specific prompts</strong> (with each brand’s name) plus{" "}
        <strong>10 category-wide prompts</strong> (leader, best, most reliable, etc.), all answered per brand;
        outputs are compared and rolled into share of voice and sentiment. Demo slate:{" "}
        <strong>Netflix</strong> vs <strong>Disney+</strong>, <strong>Max</strong>,{" "}
        <strong>Amazon Prime Video</strong>, <strong>Apple TV+</strong>, and <strong>Paramount+</strong>.
      </p>

      <CompetitiveSetPicker
        accountBrandName={businessName}
        busy={busy}
        competitorNames={savedCompetitors.length ? savedCompetitors : undefined}
        onCreate={createSet}
        onSave={saveCompetitors}
      />
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {(Object.keys(progressByBrand).length > 0 || judgeLines.length > 0 || busy) && (
        <section style={{ marginBottom: 16, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Live Run Stream</h3>
          <p style={{ marginTop: 0 }}>{progressStatus}</p>
          {judgeLines.length > 0 && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 6, background: "#fafafa" }}>
              <strong>Judge</strong>
              <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
                {judgeLines.join("\n")}
              </pre>
            </div>
          )}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {Object.entries(progressByBrand).map(([brandId, box]) => (
              <article
                key={brandId}
                style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}
              >
                <h4 style={{ margin: "0 0 8px" }}>{box.brandName}</h4>
                <p style={{ margin: "0 0 8px", color: "#555" }}>{box.status}</p>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
                  {box.lines.length ? box.lines.join("\n") : "Waiting for streamed output..."}
                </pre>
              </article>
            ))}
          </section>
        </section>
      )}

      {overview && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <ShareOfVoiceChart rows={overview.rows} brandLabels={brandLabels} />
            <SentimentComparison rows={overview.rows} brandLabels={brandLabels} />
          </section>
          <FeatureGapTable
            rows={overview.rows}
            gaps={gaps}
            brandLabels={brandLabels}
            accountBrandName={accountBrandName}
          />
          <section style={{ marginTop: 16 }}>
            <WhitespacePanel gaps={gaps} />
          </section>
        </>
      )}

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Trend Snapshot (7 days)</h3>
        {!trends ? (
          <p>No trend data yet.</p>
        ) : (
          <pre style={{ overflowX: "auto", margin: 0 }}>
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(trends.seriesByBrand).map(([id, pts]) => [brandLabels[id] ?? id, pts]),
              ),
              null,
              2,
            )}
          </pre>
        )}
      </section>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Run Configuration</h3>
        <p>
          Account: {accountBrandName} ({accountBrandId || "run to assign IDs"})
        </p>
        <p>
          Competitors:{" "}
          {competitorBrandIds.length
            ? competitorBrandIds.map((id) => brandLabels[id] ?? id).join(", ")
            : "Ulta, Bluemercury, SpaceNK, SallyBeauty, Olive Young (defaults)"}
        </p>
        <p>
          Window:{" "}
          {lastWindow
            ? `${lastWindow.windowStart} – ${lastWindow.windowEnd}`
            : "Run the benchmark to set the query window"}
        </p>
      </section>
    </main>
  );
}
