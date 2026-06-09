import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import type { BusinessProfile, CitedSource, SourcesResponse } from "../types";

function sourceBadge(type: CitedSource["sourceType"]) {
  const map: Record<CitedSource["sourceType"], string> = {
    reddit: "Reddit",
    publication: "News",
    review: "Review",
    video: "YouTube",
    wiki: "Wiki",
    other: "Other",
  };
  return map[type];
}

export function SourcesPage({ profile }: { profile: BusinessProfile }) {
  const [sources, setSources] = useState<CitedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSources([]);
    setError("");
    setLoading(true);
    fetch(`${API_BASE}/business-profiles/${profile.id}/sources`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load source attributions."))))
      .then((body: SourcesResponse) => setSources(body.sources))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load source attributions."))
      .finally(() => setLoading(false));
  }, [profile.id]);

  if (loading) {
    return (
      <article className="panel wide-panel">
        <p className="muted">Sources</p>
        <h2>Loading source attributions…</h2>
      </article>
    );
  }

  if (sources.length === 0) {
    return (
      <article className="panel wide-panel">
        <p className="muted">Sources</p>
        <h2>No source attributions for {profile.name} yet</h2>
        {error && <p className="error">{error}</p>}
        <p>
          Run a live benchmark with citation tracking enabled to surface the third-party sources AI assistants
          cite when answering about this brand.
        </p>
      </article>
    );
  }

  const totalCitations = sources.reduce((acc, s) => acc + s.citationsThisWeek, 0);
  const reddit = sources
    .filter((s) => s.sourceType === "reddit")
    .reduce((acc, s) => acc + s.citationsThisWeek, 0);
  const newsAndReviews = sources
    .filter((s) => s.sourceType === "publication" || s.sourceType === "review")
    .reduce((acc, s) => acc + s.citationsThisWeek, 0);

  return (
    <article className="panel wide-panel">
      <p className="muted">Sources</p>
      <h2>What AI cites about {profile.name}</h2>
      <p className="muted">
        The third-party sources frontier models reach for when answering questions about this brand.
        Counts are citations across the last 7 days of monitoring runs.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="sources-stat-row">
        <div className="sources-stat">
          <div className="sources-stat__label">Citations / week</div>
          <div className="sources-stat__value">{totalCitations}</div>
        </div>
        <div className="sources-stat">
          <div className="sources-stat__label">Reddit</div>
          <div className="sources-stat__value">{reddit}</div>
        </div>
        <div className="sources-stat">
          <div className="sources-stat__label">News & reviews</div>
          <div className="sources-stat__value">{newsAndReviews}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th align="left">Source</th>
            <th align="left" style={{ width: "12%" }}>Type</th>
            <th align="left" style={{ width: "26%" }}>Brands mentioned</th>
            <th align="left" style={{ width: "14%" }}>Sentiment</th>
            <th align="right" style={{ width: "10%" }}>Citations</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <td>
                <div className="sources-row__title">{s.title}</div>
                <div className="sources-row__domain">{s.domain}</div>
              </td>
              <td><span className="source-badge">{sourceBadge(s.sourceType)}</span></td>
              <td>{s.brandsMentioned.join(", ")}</td>
              <td>
                <span className={`sentiment sentiment-${s.sentiment}`}>{s.sentiment}</span>
              </td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{s.citationsThisWeek}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
