import {
  DEMO_BRAND_NAME,
  NETFLIX_RECOMMENDATIONS,
  type Recommendation,
} from "../seed/demo-content";
import type { BusinessProfile } from "../types";

function categoryLabel(category: Recommendation["category"]) {
  return category === "content"
    ? "On-site content"
    : category === "earned_media"
      ? "Earned media"
      : "Technical";
}

export function RecommendationsPage({ profile }: { profile: BusinessProfile }) {
  const isSeededBrand = profile.name === DEMO_BRAND_NAME;
  const recs = isSeededBrand ? NETFLIX_RECOMMENDATIONS : [];

  if (recs.length === 0) {
    return (
      <article className="panel wide-panel">
        <p className="muted">Recommendations</p>
        <h2>No recommendations for {profile.name} yet</h2>
        <p>Run a benchmark on Benchmarking to surface gaps; we&rsquo;ll prioritise fix-it ideas here.</p>
      </article>
    );
  }

  return (
    <article className="panel wide-panel">
      <p className="muted">Recommendations</p>
      <h2>Prioritised actions for {profile.name}</h2>
      <p className="muted">
        Each card maps to a detected gap or whitespace opportunity. Sorted high-impact first.
      </p>
      <ul className="rec-list">
        {recs.map((rec) => (
          <li key={rec.id} className="rec-card">
            <header className="rec-card__head">
              <span className="rec-card__category">{categoryLabel(rec.category)}</span>
              <span className={`rec-tag rec-tag--${rec.impact}`}>{rec.impact} impact</span>
              <span className="rec-tag rec-tag--effort">{rec.effort} effort</span>
            </header>
            <h3 className="rec-card__title">{rec.title}</h3>
            <p className="rec-card__evidence">{rec.evidence}</p>
            <div className="rec-card__action">
              <span className="rec-card__action-label">Suggested action</span>
              <p>{rec.action}</p>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
