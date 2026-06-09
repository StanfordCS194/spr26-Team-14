import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Progress } from "@/components/ui/progress";
import { Section, Stat, StatRow } from "@/components/dashboard";
import type { AdminMetricsResponse, BusinessProfile, RecommendationFeedbackMetrics } from "../types";

const emptyMetrics: RecommendationFeedbackMetrics = {
  total: 0,
  good: 0,
  bad: 0,
  unrated: 0,
};

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
    <Section
      title="Feedback metrics"
      description="Admin metrics start with recommendation quality feedback. We can add more feedback surfaces here over time."
    >
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading admin metrics…</p>
      ) : (
        <div className="grid gap-8">
          <StatRow>
            <Stat label="Good recommendations" value={metrics.good} />
            <Stat label="Bad recommendations" value={metrics.bad} />
            <Stat label="Good rate" value={goodRate} />
          </StatRow>

          <div className="grid gap-3">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-semibold tracking-tight">Recommendation feedback</h3>
              <p className="text-sm text-muted-foreground">
                {metrics.total} of {recommendationCount} recommendations have feedback ({ratedPercent}% rated).
              </p>
            </div>
            <div className="admin-feedback-bars" aria-label="Recommendation feedback breakdown">
              <div className="admin-feedback-bars__row">
                <span>Good</span>
                <Progress value={recommendationCount ? (metrics.good / recommendationCount) * 100 : 0} />
                <strong>{metrics.good}</strong>
              </div>
              <div className="admin-feedback-bars__row">
                <span>Bad</span>
                <Progress value={recommendationCount ? (metrics.bad / recommendationCount) * 100 : 0} />
                <strong>{metrics.bad}</strong>
              </div>
              <div className="admin-feedback-bars__row">
                <span>Unrated</span>
                <Progress value={recommendationCount ? (metrics.unrated / recommendationCount) * 100 : 0} />
                <strong>{metrics.unrated}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};
