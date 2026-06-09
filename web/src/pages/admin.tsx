import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import type { AdminMetricsResponse, BusinessProfile, RecommendationFeedbackMetrics } from "../types";

const emptyMetrics: RecommendationFeedbackMetrics = {
  total: 0,
  good: 0,
  bad: 0,
  unrated: 0,
};

type AdminStatProps = { label: string; value: number | string };

const AdminStat = ({ label, value }: AdminStatProps) => (
  <div className="stat">
    <div className="stat__label">{label}</div>
    <div className="stat__value">{value}</div>
  </div>
);

export const AdminPage = ({ profile }: { profile: BusinessProfile }) => {
  const [metrics, setMetrics] = useState<RecommendationFeedbackMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/business-profiles/${profile.id}/admin/metrics`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body: AdminMetricsResponse) => setMetrics(body.recommendationFeedback))
      .catch(() => setError("Could not load admin metrics."))
      .finally(() => setLoading(false));
  }, [profile.id]);

  const recommendationCount = metrics.total + metrics.unrated;
  const ratedPercent = recommendationCount === 0 ? 0 : Math.round((metrics.total / recommendationCount) * 100);
  const goodRate = metrics.total === 0 ? "0%" : `${Math.round((metrics.good / metrics.total) * 100)}%`;

  return (
    <>
      <div className="block">
        <h2 className="block__title">Feedback metrics</h2>
        <p className="muted">
          Admin metrics start with recommendation quality feedback. We can add more feedback surfaces here over time.
        </p>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <article className="card wide-panel">
            <p className="muted">Loading admin metrics…</p>
          </article>
        ) : (
          <>
            <div className="stat-row admin-stat-row">
              <AdminStat label="Good recommendations" value={metrics.good} />
              <AdminStat label="Bad recommendations" value={metrics.bad} />
              <AdminStat label="Good rate" value={goodRate} />
            </div>

            <article className="card wide-panel admin-metrics-card">
              <div>
                <h3 className="admin-metrics-card__title">Recommendation feedback</h3>
                <p className="muted">
                  {metrics.total} of {recommendationCount} recommendations have feedback ({ratedPercent}% rated).
                </p>
              </div>
              <div className="admin-feedback-bars" aria-label="Recommendation feedback breakdown">
                <div className="admin-feedback-bars__row">
                  <span>Good</span>
                  <div className="metric-row__bar">
                    <span
                      className="metric-row__fill admin-feedback-bars__good"
                      style={{ width: `${recommendationCount ? (metrics.good / recommendationCount) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{metrics.good}</strong>
                </div>
                <div className="admin-feedback-bars__row">
                  <span>Bad</span>
                  <div className="metric-row__bar">
                    <span
                      className="metric-row__fill admin-feedback-bars__bad"
                      style={{ width: `${recommendationCount ? (metrics.bad / recommendationCount) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{metrics.bad}</strong>
                </div>
                <div className="admin-feedback-bars__row">
                  <span>Unrated</span>
                  <div className="metric-row__bar">
                    <span
                      className="metric-row__fill admin-feedback-bars__unrated"
                      style={{ width: `${recommendationCount ? (metrics.unrated / recommendationCount) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{metrics.unrated}</strong>
                </div>
              </div>
            </article>
          </>
        )}
      </div>
    </>
  );
};
