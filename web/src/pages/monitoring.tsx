import { useEffect, useState } from "react";
import type { BusinessProfile, MonitoringResponse } from "../types";

const API_BASE =
  import.meta.env.DEV === true ? "/api" : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

function sentimentLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
