import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import type { AccuracyAlert, BrandFact, BusinessProfile, FactCategory } from "../types";

const emptyFact = { category: "custom" as FactCategory, label: "", value: "" };

function FactEditor({
  fact,
  onChanged,
}: {
  fact: BrandFact;
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(fact);

  async function save() {
    const res = await fetch(`${API_BASE}/business-profiles/${fact.businessProfileId}/facts/${fact.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: draft.category,
        label: draft.label,
        value: draft.value,
        active: draft.active,
      }),
    });
    if (res.ok) await onChanged();
  }

  async function remove() {
    const res = await fetch(`${API_BASE}/business-profiles/${fact.businessProfileId}/facts/${fact.id}`, {
      method: "DELETE",
    });
    if (res.ok) await onChanged();
  }

  return (
    <tr>
      <td>
        <select
          value={draft.category}
          onChange={(event) => setDraft({ ...draft, category: event.target.value as FactCategory })}
        >
          <option value="pricing">Pricing</option>
          <option value="feature">Feature</option>
          <option value="executive">Executive</option>
          <option value="company">Company</option>
          <option value="custom">Custom</option>
        </select>
      </td>
      <td><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></td>
      <td><input value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} /></td>
      <td>
        <button type="button" onClick={() => setDraft({ ...draft, active: !draft.active })}>
          {draft.active ? "Active" : "Inactive"}
        </button>
        <button type="button" onClick={save}>Save</button>
        <button type="button" onClick={remove}>Delete</button>
      </td>
    </tr>
  );
}

export function AccuracyPage({ profile }: { profile: BusinessProfile }) {
  const [facts, setFacts] = useState<BrandFact[]>([]);
  const [alerts, setAlerts] = useState<AccuracyAlert[]>([]);
  const [delivery, setDelivery] = useState({ inApp: true, emailConfigured: false, slackConfigured: false });
  const [form, setForm] = useState(emptyFact);
  const [error, setError] = useState("");

  async function load() {
    const [factRes, alertRes] = await Promise.all([
      fetch(`${API_BASE}/business-profiles/${profile.id}/facts`),
      fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts`),
    ]);
    if (!factRes.ok || !alertRes.ok) throw new Error("Could not load Accuracy Guard.");
    const factBody = await factRes.json();
    const alertBody = await alertRes.json();
    setFacts(factBody.facts);
    setAlerts(alertBody.alerts);
    setDelivery(alertBody.delivery);
  }

  useEffect(() => {
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load Accuracy Guard."));
  }, [profile.id]);

  async function addFact() {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/facts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Could not save ground-truth fact.");
      return;
    }
    setForm(emptyFact);
    await load();
  }

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
          <div className="stat__label">Open alerts</div>
          <div className="stat__value">{alerts.filter((alert) => alert.status === "open").length}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Ground-truth facts</div>
          <div className="stat__value">{facts.filter((fact) => fact.active).length}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Delivery</div>
          <div className="stat__value">
            In-app{delivery.emailConfigured ? " + email" : ""}{delivery.slackConfigured ? " + Slack" : ""}
          </div>
        </div>
      </div>

      <article className="card wide-panel">
        <h2>Brand fact sheet</h2>
        <p className="muted">Responses that discuss a fact but conflict with its configured value create an alert.</p>
        <div className="inline-form">
          <select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value as FactCategory })}
          >
            <option value="pricing">Pricing</option>
            <option value="feature">Feature</option>
            <option value="executive">Executive</option>
            <option value="company">Company</option>
            <option value="custom">Custom</option>
          </select>
          <input
            placeholder="Claim label, e.g. starting price"
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
          />
          <input
            placeholder="Ground-truth value"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
          />
          <button type="button" disabled={!form.label.trim() || !form.value.trim()} onClick={addFact}>Add fact</button>
        </div>
        <table>
          <thead><tr><th>Category</th><th>Claim</th><th>Ground truth</th><th>Actions</th></tr></thead>
          <tbody>
            {facts.map((fact) => (
              <FactEditor key={fact.id} fact={fact} onChanged={load} />
            ))}
          </tbody>
        </table>
      </article>

      <article className="card wide-panel">
        <h2>Accuracy alerts</h2>
        {alerts.length === 0 ? <p className="muted">No discrepancies detected yet.</p> : (
          <table>
            <thead><tr><th>Severity</th><th>Observed claim</th><th>Expected</th><th>Status</th></tr></thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.severity}</td>
                  <td>{alert.observedClaim}</td>
                  <td>{alert.expectedValue}</td>
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
