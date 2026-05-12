import { db } from "./client";

export type RecommendationRating = "good" | "bad";

export interface RecommendationFeedback {
  businessProfileId: string;
  recommendationId: string;
  rating: RecommendationRating;
  updatedAt: string;
}

export interface RecommendationFeedbackMetrics {
  total: number;
  good: number;
  bad: number;
  unrated: number;
}

interface FeedbackRow {
  business_profile_id: string;
  recommendation_id: string;
  rating: RecommendationRating;
  updated_at: string;
}

interface CountRow {
  rating: RecommendationRating;
  count: number;
}

function fromRow(row: FeedbackRow): RecommendationFeedback {
  return {
    businessProfileId: row.business_profile_id,
    recommendationId: row.recommendation_id,
    rating: row.rating,
    updatedAt: row.updated_at,
  };
}

const upsertFeedback = db.query<FeedbackRow, [string, string, RecommendationRating, string]>(`
  INSERT INTO recommendation_feedback (business_profile_id, recommendation_id, rating, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(business_profile_id, recommendation_id) DO UPDATE SET
    rating = excluded.rating,
    updated_at = excluded.updated_at
  RETURNING business_profile_id, recommendation_id, rating, updated_at
`);

const listByProfile = db.query<FeedbackRow, [string]>(`
  SELECT business_profile_id, recommendation_id, rating, updated_at
  FROM recommendation_feedback
  WHERE business_profile_id = ?
  ORDER BY updated_at DESC
`);

const countsByProfile = db.query<CountRow, [string]>(`
  SELECT rating, COUNT(*) as count
  FROM recommendation_feedback
  WHERE business_profile_id = ?
  GROUP BY rating
`);

export const recommendationFeedback = {
  save(businessProfileId: string, recommendationId: string, rating: RecommendationRating) {
    return fromRow(upsertFeedback.get(businessProfileId, recommendationId, rating, new Date().toISOString())!);
  },

  list(businessProfileId: string) {
    return listByProfile.all(businessProfileId).map(fromRow);
  },

  metrics(businessProfileId: string, recommendationCount: number): RecommendationFeedbackMetrics {
    const counts = countsByProfile.all(businessProfileId);
    const good = counts.find((row) => row.rating === "good")?.count ?? 0;
    const bad = counts.find((row) => row.rating === "bad")?.count ?? 0;
    const total = good + bad;

    return {
      total,
      good,
      bad,
      unrated: Math.max(recommendationCount - total, 0),
    };
  },
};
