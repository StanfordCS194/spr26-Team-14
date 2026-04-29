import {
  DEMO_BRAND_NAME,
  NETFLIX_RECOMMENDATIONS,
  type Recommendation,
} from "../seed/demo-content"
import type { BusinessProfile } from "../types"

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

type RecommendationItemProps = { rec: Recommendation; rank: number }

const RecommendationItem = ({ rec, rank }: RecommendationItemProps) => {
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
    </article>
  )
}

export const RecommendationsPage = ({ profile }: { profile: BusinessProfile }) => {
  const isSeededBrand = profile.name === DEMO_BRAND_NAME
  const recs = isSeededBrand ? sortRecommendations(NETFLIX_RECOMMENDATIONS) : []

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
        <div className="rec-stack">
          {recs.map((rec, i) => (
            <RecommendationItem key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      </div>
    </>
  )
}
