import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import type { AccuracyAlert, AccuracySummary, BusinessProfile } from "../types";

export function AccuracyPage({ profile }: { profile: BusinessProfile }) {
  const [alerts, setAlerts] = useState<AccuracyAlert[]>([]);
  const [summary, setSummary] = useState<AccuracySummary>({
    responsesChecked: 0,
    totalClaims: 0,
    citedClaims: 0,
    citationCoverage: 1,
  });
  const [delivery, setDelivery] = useState({ inApp: true, emailConfigured: false, slackConfigured: false });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts`);
    if (!res.ok) throw new Error("Could not load citation grounding.");
    const body = await res.json();
    setAlerts(body.alerts);
    setSummary(body.summary);
    setDelivery(body.delivery);
  }

  useEffect(() => {
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load citation grounding."));
  }, [profile.id]);

  async function acknowledge(alertId: string) {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts/${alertId}/acknowledge`, {
      method: "PUT",
    });
    if (res.ok) await load();
  }

  return (
    <div className="block">
      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Citation coverage</div>
          <div className="stat__value">{Math.round(summary.citationCoverage * 100)}%</div>
        </div>
        <div className="stat">
          <div className="stat__label">Claims checked</div>
          <div className="stat__value">{summary.totalClaims}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Uncited claims</div>
          <div className="stat__value">{alerts.filter((alert) => alert.status === "open").length}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Delivery</div>
          <div className="stat__value">
            In-app{delivery.emailConfigured ? " + email" : ""}{delivery.slackConfigured ? " + Slack" : ""}
          </div>
        </div>
      </div>

      <article className="card wide-panel">
        <h2>Claim citation coverage</h2>
        <p className="muted">
          Monitoring requests web evidence and requires a source beside every factual claim. Responses are checked
          sentence by sentence; an uncited claim creates an alert instead of being treated as verified.
        </p>
        {alerts.length === 0 ? <p className="muted">No unsupported claims detected yet.</p> : (
          <table>
            <thead><tr><th>Provider</th><th>Risk</th><th>Unsupported claim</th><th>Status</th></tr></thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.provider}</td>
                  <td>{alert.severity}</td>
                  <td>
                    {alert.claimText}
                    <div className="muted">{alert.explanation}</div>
                  </td>
                  <td>
                    {alert.status === "open" ? (
                      <button type="button" onClick={() => acknowledge(alert.id)}>Acknowledge</button>
                    ) : "Acknowledged"}
                  </td>
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
