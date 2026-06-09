import type { BusinessProfile } from "../../db/business-profiles";
import { businessProfiles } from "../../db/business-profiles";
import { monitoringRuns } from "../../db/monitoring-runs";
import { parseMonitoringResponse } from "../monitoring/parse-response";

function competitorId(name: string) {
  return `competitor:${encodeURIComponent(name.toLowerCase())}`;
}

export function buildMonitoringBenchmark(profile: BusinessProfile, windowDays = 7) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const competitors = businessProfiles.competitors(profile.id);
  const competitorUpdatedAt = businessProfiles.competitorUpdatedAt(profile.id);
  const brands = [
    { id: profile.id, name: profile.name },
    ...competitors.map((name) => ({ id: competitorId(name), name })),
  ];
  const attempts = monitoringRuns.attempts(profile.id).filter(
    (attempt) =>
      attempt.status === "success" &&
      attempt.rawResponse &&
      new Date(attempt.createdAt) >= windowStart &&
      new Date(attempt.createdAt) <= windowEnd &&
      (!competitorUpdatedAt || attempt.createdAt >= competitorUpdatedAt),
  );

  const mentionCounts = Object.fromEntries(brands.map((brand) => [brand.id, 0])) as Record<string, number>;
  const sentimentSamples = Object.fromEntries(brands.map((brand) => [brand.id, [] as number[]])) as Record<string, number[]>;
  const featureCounts = Object.fromEntries(brands.map((brand) => [brand.id, {} as Record<string, number>])) as Record<
    string,
    Record<string, number>
  >;
  const seriesByBrand = Object.fromEntries(brands.map((brand) => [brand.id, []])) as Record<
    string,
    Array<{ t: string; sov: number; sentiment: number }>
  >;
  const gaps: Array<{
    id: string;
    gapType: "prompt_exclusion" | "feature_praise_gap" | "whitespace";
    brandId: string;
    competitorBrandId?: string;
    promptRunId: string;
    featureKey?: string;
    categoryKey?: string;
    evidence: string[];
    confidence: number;
    detectedAt: string;
  }> = [];

  for (const attempt of attempts) {
    const parsed = brands.map((brand) => ({
      brand,
      signal: parseMonitoringResponse(brand.name, attempt.rawResponse!),
    }));
    const mentioned = parsed.filter((item) => item.signal.mentionPosition !== null);
    const responseShare = mentioned.length ? 1 / mentioned.length : 0;

    for (const item of parsed) {
      const isMentioned = item.signal.mentionPosition !== null;
      if (isMentioned) {
        mentionCounts[item.brand.id] += 1;
        sentimentSamples[item.brand.id].push(item.signal.score);
        for (const [feature, tone] of Object.entries(item.signal.featureSentiment)) {
          if (tone === "positive") {
            featureCounts[item.brand.id][feature] = (featureCounts[item.brand.id][feature] ?? 0) + 1;
          }
        }
      }
      seriesByBrand[item.brand.id].push({
        t: attempt.createdAt,
        sov: isMentioned ? responseShare : 0,
        sentiment: isMentioned ? item.signal.score : 0,
      });
    }

    const accountMentioned = mentioned.some((item) => item.brand.id === profile.id);
    if (mentioned.length === 0) {
      gaps.push({
        id: `whitespace:${attempt.id}`,
        gapType: "whitespace",
        brandId: profile.id,
        promptRunId: attempt.id,
        categoryKey: attempt.provider,
        evidence: [attempt.rawResponse!.slice(0, 280)],
        confidence: 0.9,
        detectedAt: attempt.createdAt,
      });
    } else if (!accountMentioned) {
      for (const item of mentioned.filter((entry) => entry.brand.id !== profile.id)) {
        gaps.push({
          id: `exclusion:${attempt.id}:${item.brand.id}`,
          gapType: "prompt_exclusion",
          brandId: profile.id,
          competitorBrandId: item.brand.id,
          promptRunId: attempt.id,
          categoryKey: attempt.provider,
          evidence: [attempt.rawResponse!.slice(0, 280)],
          confidence: 0.85,
          detectedAt: attempt.createdAt,
        });
        const praisedFeature = Object.entries(item.signal.featureSentiment).find(([, tone]) => tone === "positive")?.[0];
        if (praisedFeature) {
          gaps.push({
            id: `feature:${attempt.id}:${item.brand.id}:${praisedFeature}`,
            gapType: "feature_praise_gap",
            brandId: profile.id,
            competitorBrandId: item.brand.id,
            promptRunId: attempt.id,
            featureKey: praisedFeature,
            categoryKey: attempt.provider,
            evidence: [attempt.rawResponse!.slice(0, 280)],
            confidence: 0.8,
            detectedAt: attempt.createdAt,
          });
        }
      }
    }
  }

  const totalMentions = Object.values(mentionCounts).reduce((sum, count) => sum + count, 0);
  const rows = brands.map((brand) => {
    const samples = sentimentSamples[brand.id];
    const features = featureCounts[brand.id];
    return {
      brandId: brand.id,
      shareOfVoice: totalMentions ? mentionCounts[brand.id] / totalMentions : 0,
      sentiment: samples.length ? samples.reduce((sum, score) => sum + score, 0) / samples.length : 0,
      topFeatures: Object.entries(features)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([feature]) => feature),
    };
  });

  return {
    hasData: attempts.length > 0,
    timeframe: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    brandLabels: Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    accountBrandId: profile.id,
    accountBrandName: profile.name,
    competitorBrandIds: brands.slice(1).map((brand) => brand.id),
    overview: { timeframe: { start: windowStart.toISOString(), end: windowEnd.toISOString() }, rows },
    trends: { timeframe: { start: windowStart.toISOString(), end: windowEnd.toISOString() }, seriesByBrand },
    gaps,
  };
}
