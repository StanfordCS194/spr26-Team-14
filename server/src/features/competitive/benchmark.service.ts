import { getComparisonsByPromptRun, getPromptRunsByWindow } from "./queries";

function avg(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildCompetitiveOverview(input: { windowStart: string; windowEnd: string }) {
  const promptRuns = getPromptRunsByWindow(input.windowStart, input.windowEnd);
  const comparisons = getComparisonsByPromptRun(promptRuns.map((run) => run.id));

  const shareSamples: Record<string, number[]> = {};
  const sentimentSamples: Record<string, number[]> = {};
  const featureCounts: Record<string, Record<string, number>> = {};

  for (const comparison of comparisons) {
    for (const [brandId, share] of Object.entries(comparison.shareOfVoiceByBrand)) {
      shareSamples[brandId] ??= [];
      shareSamples[brandId].push(share);
    }

    for (const [brandId, sentiment] of Object.entries(comparison.sentimentByBrand)) {
      sentimentSamples[brandId] ??= [];
      sentimentSamples[brandId].push(sentiment);
    }

    for (const [brandId, features] of Object.entries(comparison.praisedFeaturesByBrand)) {
      featureCounts[brandId] ??= {};
      for (const feature of features) {
        featureCounts[brandId][feature] = (featureCounts[brandId][feature] ?? 0) + 1;
      }
    }
  }

  const brands = new Set([...Object.keys(shareSamples), ...Object.keys(sentimentSamples)]);
  const rows = Array.from(brands).map((brandId) => {
    const features = featureCounts[brandId] ?? {};
    const topFeatures = Object.entries(features)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([feature]) => feature);

    return {
      brandId,
      shareOfVoice: Number(avg(shareSamples[brandId] ?? []).toFixed(3)),
      sentiment: Number(avg(sentimentSamples[brandId] ?? []).toFixed(3)),
      topFeatures,
    };
  });

  return {
    timeframe: { start: input.windowStart, end: input.windowEnd },
    rows,
  };
}

export function buildCompetitiveTrends(input: { windowStart: string; windowEnd: string }) {
  const promptRuns = getPromptRunsByWindow(input.windowStart, input.windowEnd);
  const comparisons = getComparisonsByPromptRun(promptRuns.map((run) => run.id));
  const seriesByBrand: Record<string, Array<{ t: string; sov: number; sentiment: number }>> = {};

  for (const comparison of comparisons) {
    const promptRun = promptRuns.find((run) => run.id === comparison.promptRunId);
    const t = promptRun?.createdAt ?? new Date().toISOString();

    for (const brandId of Object.keys(comparison.shareOfVoiceByBrand)) {
      seriesByBrand[brandId] ??= [];
      seriesByBrand[brandId].push({
        t,
        sov: comparison.shareOfVoiceByBrand[brandId] ?? 0,
        sentiment: comparison.sentimentByBrand[brandId] ?? 0,
      });
    }
  }

  return {
    timeframe: { start: input.windowStart, end: input.windowEnd },
    seriesByBrand,
  };
}
