import { useEffect, useState } from "react";
import type { BusinessProfile, MonitoringResponse } from "../types";

const API_BASE =
  import.meta.env.DEV === true ? "/api" : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

function sentimentLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const sentimentHistory = [-0.18, -0.08, 0.04, 0.12, 0.26, 0.18, -0.06].map((score, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return {
    date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score,
  };
});

const yTicks = [-1, -0.5, 0, 0.5, 1];

export function SentimentTrend() {
  const width = 700;
  const height = 220;
  const padX = 48;
  const padTop = 18;
  const padBottom = 32;
  const chartHeight = height - padTop - padBottom;
  const yForScore = (score: number) => padTop + ((1 - score) / 2) * chartHeight;
  const midY = yForScore(0);
  const points = sentimentHistory.map((item, index) => {
    const x = padX + (index * (width - padX * 2)) / (sentimentHistory.length - 1);
    const y = yForScore(item.score);
    return { ...item, x, y };
  });

  return (
    <section className="sentiment-card">
      <div>
        <p className="muted">Overall Sentiment</p>
        <h3>Past 7 days</h3>
      </div>
      <svg className="sentiment-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="7 day sentiment trend">
        {points.map((point) => (
          <line
            key={`grid-${point.date}`}
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
              key={point.date}
              className={positive ? "trend-line trend-positive" : "trend-line trend-negative"}
              x1={point.x}
              x2={next.x}
              y1={point.y}
              y2={next.y}
            />
          );
        })}
        {points.map((point) => (
          <g key={point.date}>
            <circle className={point.score >= 0 ? "trend-dot trend-dot-positive" : "trend-dot trend-dot-negative"} cx={point.x} cy={point.y} r="5" />
            <text className="chart-label" x={point.x} y={height - 4} textAnchor="middle">
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

export function MonitoringPage({ profile }: { profile: BusinessProfile }) {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [error, setError] = useState("");

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
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/monitoring-prompts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      setError("Could not add prompt.");
      return;
    }
    setNewPrompt("");
    await load();
  }

  if (!data || (data.status === "generating" && data.prompts.length === 0)) {
    return (
      <article className="panel">
        <p className="muted">Monitoring</p>
        <h2>Generating starter prompts...</h2>
        <p>Perception is creating chatbot queries for {profile.name} from the website and business description.</p>
      </article>
    );
  }

  return (
    <article className="panel wide-panel">
      <p className="muted">Monitoring</p>
      <h2>{profile.name}</h2>
      <p>Track the prompts where this business should appear in chatbot answers.</p>
      <SentimentTrend />

      <table>
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Mention</th>
          </tr>
        </thead>
        <tbody>
          {data.prompts.map((item) => (
            <tr key={item.id}>
              <td>{item.prompt}</td>
              <td>
                <span className={`sentiment sentiment-${item.mentionSentiment}`}>
                  {sentimentLabel(item.mentionSentiment)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inline-form">
        <input
          placeholder="Add a prompt to monitor"
          value={newPrompt}
          onChange={(event) => setNewPrompt(event.target.value)}
        />
        <button type="button" onClick={addPrompt} disabled={!newPrompt.trim()}>
          Add prompt
        </button>
      </div>

      {data.status === "error" && <p className="error">{data.error ?? "Prompt generation fell back to sample data."}</p>}
      {error && <p className="error">{error}</p>}
    </article>
  );
}
