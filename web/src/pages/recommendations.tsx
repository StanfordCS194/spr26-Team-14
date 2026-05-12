import { useEffect, useMemo, useState } from "react"
import { API_BASE } from "../api"
import {
  DEMO_BRAND_NAME,
  NETFLIX_RECOMMENDATIONS,
  type Recommendation,
} from "../seed/demo-content"
import type { BusinessProfile, RecommendationFeedback, RecommendationRating } from "../types"

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

type SummaryStatProps = { label: string; value: number }

const SummaryStat = ({ label, value }: SummaryStatProps) => (
  <div className="stat">
    <div className="stat__label">{label}</div>
    <div className="stat__value">{value}</div>
  </div>
)

type RecommendationItemProps = {
  rec: Recommendation
  rank: number
  rating?: RecommendationRating
  onRate: (recommendationId: string, rating: RecommendationRating) => void
}

const RecommendationItem = ({ rec, rank, rating, onRate }: RecommendationItemProps) => {
  const titleId = `rec-title-${rec.id}`
  return (
    <article className="card" aria-labelledby={titleId}>
      <div className="chip-row" aria-label="Category, impact, and effort">
        <span className="chip">{categoryLabel(rec.category)}</span>
        <span className="chip">{rec.impact} impact</span>
        <span className="chip">{rec.effort} effort</span>
      </div>
      <h3 className="rec-item__title" id={titleId}>
        <span className="rec-item__rank">{rank}.</span>
        {rec.title}
      </h3>
      <p className="subhead">Signal</p>
      <p className="rec-item__body">{rec.evidence}</p>
      <p className="subhead">Suggested action</p>
      <p className="rec-item__body">{rec.action}</p>
      <div className="rec-feedback" aria-label={`Feedback for ${rec.title}`}>
        <span className="rec-feedback__label">Was this recommendation useful?</span>
        <div className="rec-feedback__actions">
          <button
            type="button"
            className={rating === "good" ? "feedback-button feedback-button--good active" : "feedback-button feedback-button--good"}
            aria-pressed={rating === "good"}
            onClick={() => onRate(rec.id, "good")}
          >
            Good
          </button>
          <button
            type="button"
            className={rating === "bad" ? "feedback-button feedback-button--bad active" : "feedback-button feedback-button--bad"}
            aria-pressed={rating === "bad"}
            onClick={() => onRate(rec.id, "bad")}
          >
            Bad
          </button>
        </div>
      </div>
    </article>
  )
}

export const RecommendationsPage = ({ profile }: { profile: BusinessProfile }) => {
  const isSeededBrand = profile.name === DEMO_BRAND_NAME
  const recs = useMemo(() => (isSeededBrand ? sortRecommendations(NETFLIX_RECOMMENDATIONS) : []), [isSeededBrand])
  const [ratings, setRatings] = useState<Record<string, RecommendationRating>>({})
  const [feedbackError, setFeedbackError] = useState("")

  useEffect(() => {
    setRatings({})
    setFeedbackError("")
    fetch(`${API_BASE}/business-profiles/${profile.id}/recommendation-feedback`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body: { feedback: RecommendationFeedback[] }) => {
        setRatings(
          Object.fromEntries(body.feedback.map((item) => [item.recommendationId, item.rating])),
        )
      })
      .catch(() => setFeedbackError("Could not load recommendation feedback."))
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

  if (recs.length === 0) {
    return (
      <article className="panel wide-panel">
        <p className="muted">Recommendations</p>
        <h2>No recommendations for {profile.name} yet</h2>
        <p className="muted">
          Run a benchmark on Benchmarking to surface gaps; we&rsquo;ll prioritise fix-it ideas here.
        </p>
      </article>
    )
  }

  const highImpact = recs.filter((r) => r.impact === "high").length
  const quickWins = recs.filter(
    (r) => r.effort === "low" && (r.impact === "high" || r.impact === "medium"),
  ).length

  return (
    <>
      <div className="block">
        <h2 className="block__title">At a glance</h2>
        <p className="muted">Initiative counts for {profile.name}, ranked like the benchmarking tabs.</p>
        <div className="stat-row">
          <SummaryStat label="Active initiatives" value={recs.length} />
          <SummaryStat label="High impact" value={highImpact} />
          <SummaryStat label="Quick wins" value={quickWins} />
        </div>
      </div>

      <div className="block">
        <h2 className="block__title">Prioritised actions</h2>
        <p className="muted">High impact first. Each card maps to a detected gap or whitespace cue.</p>
        {feedbackError && <p className="error">{feedbackError}</p>}
        <div className="rec-stack">
          {recs.map((rec, i) => (
            <RecommendationItem
              key={rec.id}
              rec={rec}
              rank={i + 1}
              rating={ratings[rec.id]}
              onRate={rateRecommendation}
            />
          ))}
        </div>
      </div>
    </>
  )
}
