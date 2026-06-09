import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import type {
  AccuracyAlert,
  AccuracySummary,
  BusinessProfile,
  CitationProviderSummary,
} from "../types";

const emptySummary: AccuracySummary = {
  responsesChecked: 0,
  totalClaims: 0,
  citedClaims: 0,
  citationCoverage: 1,
};

function percentage(value: number | null, claims: number) {
  return value === null || claims === 0 ? "—" : `${Math.round(value * 100)}%`;
}

export function AccuracyPage({ profile }: { profile: BusinessProfile }) {
  const [alerts, setAlerts] = useState<AccuracyAlert[]>([]);
  const [summary, setSummary] = useState<AccuracySummary>(emptySummary);
  const [providers, setProviders] = useState<CitationProviderSummary[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts`);
    if (!res.ok) throw new Error("Could not load citation evidence.");
    const body = await res.json();
    setAlerts(body.alerts);
    setSummary(body.summary);
    setProviders(body.providers);
  }

  useEffect(() => {
    setAlerts([]);
    setSummary(emptySummary);
    setProviders([]);
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load citation evidence."));
  }, [profile.id]);

  async function acknowledge(alertId: string) {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts/${alertId}/acknowledge`, {
      method: "PUT",
    });
    if (res.ok) await load();
  }

  const openAlerts = alerts.filter((alert) => alert.status === "open");

  return (
    <div className="block">
      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Responses audited</div>
          <div className="stat__value">{summary.responsesChecked}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Claims with sources</div>
          <div className="stat__value">{summary.citedClaims} / {summary.totalClaims}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Citation coverage</div>
          <div className="stat__value">{percentage(summary.citationCoverage, summary.totalClaims)}</div>
        </div>
      </div>

      <article className="card wide-panel">
        <h2>Evidence coverage by provider</h2>
        <p className="muted">
          A citation makes a claim traceable, not automatically true. This audit checks whether each factual claim
          has an inline source; source quality and contradictions still require review.
        </p>
        <table>
          <thead><tr><th>Provider</th><th>Responses</th><th>Sourced claims</th><th>Coverage</th></tr></thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.provider}>
                <td>{provider.provider}</td>
                <td>{provider.responsesChecked}</td>
                <td>{provider.citedClaims} / {provider.totalClaims}</td>
                <td>{percentage(provider.citationCoverage, provider.totalClaims)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card wide-panel">
        <h2>Unsupported factual claims</h2>
        {openAlerts.length === 0 ? (
          <p className="muted">
            {summary.responsesChecked === 0
              ? "No responses have been audited yet. Run monitoring or a benchmark first."
              : "Every audited factual claim currently has an inline source."}
          </p>
        ) : (
          <table>
            <thead><tr><th>Provider</th><th>Risk</th><th>Claim without a source</th><th>Action</th></tr></thead>
            <tbody>
              {openAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.provider}</td>
                  <td>{alert.severity}</td>
                  <td>{alert.claimText}</td>
                  <td><button type="button" onClick={() => acknowledge(alert.id)}>Acknowledge</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
