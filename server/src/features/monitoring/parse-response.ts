import type { MentionSentiment } from "../../db/monitoring-prompts";

const positiveWords = ["best", "good", "great", "reliable", "recommended", "strong", "easy", "excellent"];
const negativeWords = ["bad", "poor", "expensive", "unreliable", "weak", "difficult", "avoid", "problem"];
const featureTerms = ["pricing", "support", "reliability", "quality", "features", "onboarding", "innovation"];

function scoreText(text: string) {
  const lower = text.toLowerCase();
  const positive = positiveWords.filter((word) => lower.includes(word)).length;
  const negative = negativeWords.filter((word) => lower.includes(word)).length;
  return Math.max(-1, Math.min(1, (positive - negative) / Math.max(positive + negative, 1)));
}

function sentiment(score: number): MentionSentiment {
  if (score >= 0.2) return "positive";
  if (score <= -0.2) return "negative";
  return "neutral";
}

export function parseMonitoringResponse(brandName: string, rawResponse: string) {
  const lower = rawResponse.toLowerCase();
  const brandIndex = lower.indexOf(brandName.toLowerCase());
  const score = brandIndex === -1 ? 0 : scoreText(rawResponse);
  const featureSentiment = Object.fromEntries(
    featureTerms
      .filter((feature) => lower.includes(feature))
      .map((feature) => [feature, sentiment(score)]),
  );
  const sources = [...new Set(
    (rawResponse.match(/https?:\/\/[^\s)\]}>,]+/g) ?? []).map((source) => source.replace(/[.!?:;]+$/, "")),
  )];

  return {
    score,
    mentionSentiment: sentiment(score),
    mentionPosition: brandIndex === -1 ? null : brandIndex,
    recommended: brandIndex !== -1 && /\b(recommend(?:ed)?|best|top choice|great option)\b/i.test(rawResponse),
    featureSentiment,
    sources,
  };
}
