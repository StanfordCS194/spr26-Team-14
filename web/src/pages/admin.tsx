import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AdminMetricsResponse, BusinessProfile, RecommendationFeedbackMetrics } from "../types";

const emptyMetrics: RecommendationFeedbackMetrics = {
  total: 0,
  good: 0,
  bad: 0,
  unrated: 0,
};

type AdminStatProps = { label: string; value: number | string };

const AdminStat = ({ label, value }: AdminStatProps) => (
  <Card size="sm">
    <CardHeader>
      <CardDescription>{label}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </CardContent>
  </Card>
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
          <Card className="wide-panel">
            <CardContent>
              <p className="muted">Loading admin metrics…</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="stat-row admin-stat-row">
              <AdminStat label="Good recommendations" value={metrics.good} />
              <AdminStat label="Bad recommendations" value={metrics.bad} />
              <AdminStat label="Good rate" value={goodRate} />
            </div>

            <Card className="wide-panel admin-metrics-card">
              <CardHeader>
                <CardTitle>Recommendation feedback</CardTitle>
                <CardDescription>
                  {metrics.total} of {recommendationCount} recommendations have feedback ({ratedPercent}% rated).
                </CardDescription>
              </CardHeader>
              <CardContent className="admin-feedback-bars" aria-label="Recommendation feedback breakdown">
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
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};
