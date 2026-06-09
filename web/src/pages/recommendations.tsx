import { useEffect, useMemo, useState } from "react"
import { API_BASE } from "../api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/native-select"
import { ThumbsDownIcon, ThumbsUpIcon } from "@/components/app-icons"
import type {
  BusinessProfile,
  Recommendation,
  RecommendationFeedback,
  RecommendationRating,
  RecommendationStatus,
  RecommendationsResponse,
} from "../types"

const IMPACT_ORDER: Record<Recommendation["impact"], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const categoryLabel = (category: Recommendation["category"]) => {
  if (category === "content") return "On-site content"
  if (category === "earned_media") return "Earned media"
  return "Technical"
}

const sortRecommendations = (recs: Recommendation[]) => {
  return [...recs].sort((a, b) => {
    const byImpact = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]
    if (byImpact !== 0) return byImpact
    return a.title.localeCompare(b.title)
  })
}

const normalizeEvidence = (text: string) =>
  text
    .replaceAll(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, "")
    .replaceAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "the brand")
    .replaceAll(/\s+/g, " ")
    .trim()

type SummaryStatProps = { label: string; value: number }

const SummaryStat = ({ label, value }: SummaryStatProps) => (
  <Card size="sm">
    <CardHeader>
      <CardDescription>{label}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </CardContent>
  </Card>
)

type RecommendationItemProps = {
  rec: Recommendation
  rank: number
  rating?: RecommendationRating
  onRate: (recommendationId: string, rating: RecommendationRating) => void
  onStatus: (recommendationId: string, status: RecommendationStatus) => void
}

const RecommendationItem = ({ rec, rank, rating, onRate, onStatus }: RecommendationItemProps) => {
  const titleId = `rec-title-${rec.id}`
  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <div className="flex flex-wrap gap-1.5" aria-label="Category, impact, and effort">
          <Badge variant="secondary">{categoryLabel(rec.category)}</Badge>
          <Badge variant={rec.impact === "high" ? "default" : "outline"}>{rec.impact} impact</Badge>
          <Badge variant="outline">{rec.effort} effort</Badge>
        </div>
        <CardTitle id={titleId} className="flex items-center gap-2">
          <span className="text-muted-foreground">{rank}.</span>
          {rec.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <p className="subhead">Signal</p>
          <p className="rec-item__body">{normalizeEvidence(rec.evidence)}</p>
        </div>
        <div>
          <p className="subhead">Suggested action</p>
          <p className="rec-item__body">{rec.action}</p>
        </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Status</span>
        <NativeSelect
          value={rec.status}
          onChange={(event) => onStatus(rec.id, event.target.value as RecommendationStatus)}
        >
            <option value="proposed">Proposed</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="dismissed">Dismissed</option>
        </NativeSelect>
        {rec.targetProvider && <Badge variant="outline">Target: {rec.targetProvider}</Badge>}
        {rec.lift.delta !== null && (
          <Badge variant="secondary">
            Measured lift: {rec.lift.delta >= 0 ? "+" : ""}{rec.lift.delta.toFixed(2)}
          </Badge>
        )}
      </div>
      <div className="rec-feedback" aria-label={`Feedback for ${rec.title}`}>
        <span className="rec-feedback__label">Was this recommendation useful?</span>
        <div className="rec-feedback__actions">
          <Button
            type="button"
            variant={rating === "good" ? "default" : "outline"}
            size="sm"
            aria-pressed={rating === "good"}
            onClick={() => onRate(rec.id, "good")}
          >
            <ThumbsUpIcon data-icon="inline-start" />
            Good
          </Button>
          <Button
            type="button"
            variant={rating === "bad" ? "destructive" : "outline"}
            size="sm"
            aria-pressed={rating === "bad"}
            onClick={() => onRate(rec.id, "bad")}
          >
            <ThumbsDownIcon data-icon="inline-start" />
            Bad
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
  )
}

export const RecommendationsPage = ({ profile }: { profile: BusinessProfile }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [ratings, setRatings] = useState<Record<string, RecommendationRating>>({})
  const [loading, setLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState("")
  const [loadError, setLoadError] = useState("")
  const recs = useMemo(() => sortRecommendations(recommendations), [recommendations])

  useEffect(() => {
    setRecommendations([])
    setRatings({})
    setFeedbackError("")
    setLoadError("")
    setLoading(true)

    Promise.all([
      fetch(`${API_BASE}/business-profiles/${profile.id}/recommendations`).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("Could not load recommendations.")),
      ),
      fetch(`${API_BASE}/business-profiles/${profile.id}/recommendation-feedback`).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("Could not load recommendation feedback.")),
      ),
    ])
      .then(([recommendationBody, feedbackBody]: [RecommendationsResponse, { feedback: RecommendationFeedback[] }]) => {
        setRecommendations(recommendationBody.recommendations)
        setRatings(
          Object.fromEntries(feedbackBody.feedback.map((item) => [item.recommendationId, item.rating])),
        )
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load recommendations."))
      .finally(() => setLoading(false))
  }, [profile.id])

  async function rateRecommendation(recommendationId: string, rating: RecommendationRating) {
    const previousRating = ratings[recommendationId]
    setFeedbackError("")
    setRatings((current) => ({ ...current, [recommendationId]: rating }))
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/recommendation-feedback`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recommendationId, rating }),
    })
    if (!res.ok) {
      setRatings((current) => {
        const next = { ...current }
        if (previousRating) next[recommendationId] = previousRating
        else delete next[recommendationId]
        return next
      })
      setFeedbackError("Could not save recommendation feedback.")
    }
  }

  async function updateStatus(recommendationId: string, status: RecommendationStatus) {
    const previous = recommendations
    setRecommendations((current) => current.map((rec) => rec.id === recommendationId ? { ...rec, status } : rec))
    const res = await fetch(
      `${API_BASE}/business-profiles/${profile.id}/recommendations/${recommendationId}/status`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
    )
    if (!res.ok) {
      setRecommendations(previous)
      setFeedbackError("Could not update recommendation status.")
      return
    }
    const updated = await res.json() as Recommendation
    setRecommendations((current) => current.map((rec) => rec.id === recommendationId ? updated : rec))
  }

  if (loading) {
    return (
      <Card className="wide-panel">
        <CardHeader>
          <CardDescription>Recommendations</CardDescription>
          <CardTitle>Loading recommendations…</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (recs.length === 0) {
    return (
      <Card className="wide-panel">
        <CardHeader>
          <CardDescription>Recommendations</CardDescription>
          <CardTitle>No recommendations for {profile.name} yet</CardTitle>
        </CardHeader>
        <CardContent>
        {loadError && <p className="error">{loadError}</p>}
        <p className="muted">
          Run a live benchmark on Benchmarking to surface gaps; we&rsquo;ll prioritise fix-it ideas here.
        </p>
        </CardContent>
      </Card>
    )
  }

  const activeRecs = recs.filter((r) => r.status !== "completed" && r.status !== "dismissed")
  const highImpact = activeRecs.filter((r) => r.impact === "high").length
  const quickWins = activeRecs.filter(
    (r) => r.effort === "low" && (r.impact === "high" || r.impact === "medium"),
  ).length

  return (
    <>
      <div className="block">
        <h2 className="block__title">At a glance</h2>
        <p className="muted">Initiative counts for {profile.name}, ranked like the benchmarking tabs.</p>
        <div className="stat-row">
          <SummaryStat label="Active initiatives" value={activeRecs.length} />
          <SummaryStat label="High impact" value={highImpact} />
          <SummaryStat label="Quick wins" value={quickWins} />
        </div>
      </div>

      <div className="block">
        <h2 className="block__title">Prioritised actions</h2>
        <p className="muted">High impact first. Each card maps to a detected gap or whitespace cue.</p>
        {loadError && <p className="error">{loadError}</p>}
        {feedbackError && <p className="error">{feedbackError}</p>}
        <div className="rec-stack">
          {recs.map((rec, i) => (
            <RecommendationItem
              key={rec.id}
              rec={rec}
              rank={i + 1}
              rating={ratings[rec.id]}
              onRate={rateRecommendation}
              onStatus={updateStatus}
            />
          ))}
        </div>
      </div>
    </>
  )
}
