import { useState } from "react";
import { CompetitiveSetPicker } from "../components/competitive/CompetitiveSetPicker";
import { FeatureGapTable } from "../components/competitive/FeatureGapTable";
import { SentimentComparison } from "../components/competitive/SentimentComparison";
import { ShareOfVoiceChart } from "../components/competitive/ShareOfVoiceChart";
import { WhitespacePanel } from "../components/competitive/WhitespacePanel";
import type { GapEvent, OverviewResponse, TrendsResponse } from "../types";

const API_BASE =
  import.meta.env.DEV === true ? "/api" : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

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

  const [lastWindow, setLastWindow] = useState<{ windowStart: string; windowEnd: string } | null>(null);

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

      const runRes = await fetch(`${API_BASE}/competitive/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "Inter, Arial, sans-serif" }}>
      <h1>Competitive Benchmarking — Demo</h1>
      <p style={{ marginTop: 0 }}>
        Each run uses <strong>10 brand-specific prompts</strong> (with each retailer’s name) plus{" "}
        <strong>10 category-wide prompts</strong> (leader, best, most reliable, etc.), all answered per retailer;
        outputs are compared and rolled into share of voice and sentiment. Default slate:{" "}
        <strong>Sephora</strong> vs <strong>Ulta</strong>, <strong>Bluemercury</strong>, <strong>SpaceNK</strong>,{" "}
        <strong>SallyBeauty</strong>, and <strong>Olive Young</strong>.
      </p>

      <CompetitiveSetPicker onCreate={createSet} busy={busy} />
      {error && <p style={{ color: "crimson" }}>{error}</p>}

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
