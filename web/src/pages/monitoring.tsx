import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section } from "@/components/dashboard";
import { PlayIcon, PlusIcon } from "@/components/app-icons";
import type { BusinessProfile, MonitoringHistoryPoint, MonitoringResponse } from "../types";

function sentimentLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const yTicks = [-1, -0.5, 0, 0.5, 1];

export function SentimentTrend({ history }: { history: MonitoringHistoryPoint[] }) {
  const width = 700;
  const height = 220;
  const padX = 48;
  const padTop = 18;
  const padBottom = 32;
  const chartHeight = height - padTop - padBottom;
  const yForScore = (score: number) => padTop + ((1 - score) / 2) * chartHeight;
  const dailyHistory = Object.values(history.reduce<Record<string, { t: string; total: number; count: number }>>(
    (days, item) => {
      const date = new Date(item.t).toLocaleDateString();
      const current = days[date] ?? { t: item.t, total: 0, count: 0 };
      days[date] = { t: item.t, total: current.total + item.score, count: current.count + 1 };
      return days;
    },
    {},
  )).map((day) => ({ t: day.t, score: day.total / day.count }));
  const points = dailyHistory.map((item, index) => {
    const x = dailyHistory.length === 1
      ? width / 2
      : padX + (index * (width - padX * 2)) / (dailyHistory.length - 1);
    const y = yForScore(item.score);
    return {
      date: new Date(item.t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: item.score,
      x,
      y,
    };
  });

  return (
    <Section title="Overall sentiment" description="Past 7 days">
      <svg className="sentiment-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="7 day sentiment trend">
        {points.map((point) => (
          <line
            key={`grid-${point.date}-${point.x}`}
            className="grid-line"
            x1={point.x}
            x2={point.x}
            y1={padTop}
            y2={height - padBottom}
          />
        ))}
        {yTicks.map((tick) => {
          const y = yForScore(tick);
          return (
            <g key={tick}>
              {tick === 0 && <line className="neutral-line" x1={padX} x2={width - padX} y1={y} y2={y} />}
              <text className="axis-label" x={padX - 12} y={y + 4} textAnchor="end">
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          );
        })}
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1]!;
          const positive = (point.score + next.score) / 2 >= 0;
          return (
            <line
              key={`${point.date}-${point.x}`}
              className={positive ? "trend-line trend-positive" : "trend-line trend-negative"}
              x1={point.x}
              x2={next.x}
              y1={point.y}
              y2={next.y}
            />
          );
        })}
        {points.map((point) => (
          <g key={`${point.date}-${point.x}`}>
            <circle className={point.score >= 0 ? "trend-dot trend-dot-positive" : "trend-dot trend-dot-negative"} cx={point.x} cy={point.y} r="5" />
            <text className="chart-label" x={point.x} y={height - 4} textAnchor="middle">
              {point.date}
            </text>
          </g>
        ))}
        {points.length === 0 && (
          <text className="chart-label" x={width / 2} y={height / 2} textAnchor="middle">
            Run monitoring to build a live sentiment trend.
          </text>
        )}
      </svg>
    </Section>
  );
}

export function MonitoringPage({ profile }: { profile: BusinessProfile }) {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [newCategory, setNewCategory] = useState<MonitoringResponse["prompts"][number]["category"]>("custom");
  const [newCadence, setNewCadence] = useState<MonitoringResponse["prompts"][number]["cadence"]>("daily");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function load() {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/monitoring`);
    if (!res.ok) {
      throw new Error("Could not load monitoring prompts.");
    }
    setData(await res.json());
  }

  useEffect(() => {
    setData(null);
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load monitoring prompts."));
  }, [profile.id]);

  useEffect(() => {
    if (data?.status !== "generating") {
      return;
    }
    const id = setInterval(() => {
      load().catch(() => undefined);
    }, 2000);
    return () => clearInterval(id);
  }, [data?.status, profile.id]);

  async function addPrompt() {
    const prompt = newPrompt.trim();
    if (!prompt) {
      return;
    }
    setError("");
    try {
      const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/monitoring-prompts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, category: newCategory, cadence: newCadence, active: true }),
      });
      if (!res.ok) {
        setError("Could not add prompt.");
        return;
      }
      setNewPrompt("");
      await load();
    } catch {
      setError("Could not add prompt. Check your connection and try again.");
    }
  }

  async function togglePrompt(item: MonitoringResponse["prompts"][number]) {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/monitoring-prompts/${item.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...item, active: !item.active }),
    });
    if (res.ok) await load();
  }

  async function runLiveMonitoring() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/monitoring/runs`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not run live monitoring.");
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run live monitoring.");
    } finally {
      setRunning(false);
    }
  }

  if (!data || (data.status === "generating" && data.prompts.length === 0)) {
    return (
      <Section
        title="Generating starter prompts…"
        description={`Perception is creating chatbot queries for ${profile.name} from the website and business description.`}
      />
    );
  }

  return (
    <div className="grid gap-8">
      <SentimentTrend history={data.history} />

      <Section
        title="Tracked prompts"
        description={`Track the prompts where ${profile.name} should appear in chatbot answers.`}
        action={
          <Button type="button" onClick={runLiveMonitoring} disabled={running || data.prompts.length === 0}>
            <PlayIcon data-icon="inline-start" />
            {running ? "Running monitoring…" : "Run live monitoring"}
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prompt</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Mention</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.prompts.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-normal">{item.prompt}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.cadence}</TableCell>
                <TableCell>
                  <Badge variant={item.mentionSentiment === "negative" ? "destructive" : item.mentionSentiment === "positive" ? "default" : "outline"}>
                    {sentimentLabel(item.mentionSentiment)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button type="button" variant="outline" size="sm" onClick={() => togglePrompt(item)}>
                    {item.active ? "Active" : "Paused"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap gap-2">
          <Input
            className="w-full min-w-72 flex-1"
            placeholder="Add a prompt to monitor"
            value={newPrompt}
            onChange={(event) => setNewPrompt(event.target.value)}
          />
          <NativeSelect value={newCategory} onChange={(event) => setNewCategory(event.target.value as typeof newCategory)}>
            <option value="comparison">Comparison</option>
            <option value="recommendation">Recommendation</option>
            <option value="feature">Feature</option>
            <option value="pricing">Pricing</option>
            <option value="custom">Custom</option>
          </NativeSelect>
          <NativeSelect value={newCadence} onChange={(event) => setNewCadence(event.target.value as typeof newCadence)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </NativeSelect>
          <Button type="button" onClick={addPrompt} disabled={!newPrompt.trim()}>
            <PlusIcon data-icon="inline-start" />
            Add prompt
          </Button>
        </div>
      </Section>

      <Section title="Provider health">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Successful</TableHead>
              <TableHead>Mentions</TableHead>
              <TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.summary.providerBreakdown.map((item) => (
              <TableRow key={item.provider}>
                <TableCell>{sentimentLabel(item.provider)}</TableCell>
                <TableCell>{item.successes} / {item.attempts}</TableCell>
                <TableCell>{item.mentions}</TableCell>
                <TableCell>{item.errors}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      {data.summary.latestAttempts.some((attempt) => attempt.status === "error") && (
        <div className="error">
          {data.summary.latestAttempts
            .filter((attempt) => attempt.status === "error")
            .map((attempt) => `${sentimentLabel(attempt.provider)}: ${attempt.error}`)
            .join(" ")}
        </div>
      )}

      {data.status === "error" && <p className="error">{data.error ?? "Prompt generation fell back to sample data."}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
