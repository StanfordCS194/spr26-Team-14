import { expect, test } from "bun:test";
import { businessProfiles } from "../../db/business-profiles";
import { monitoringPrompts } from "../../db/monitoring-prompts";
import { monitoringRuns } from "../../db/monitoring-runs";
import { buildMonitoringBenchmark } from "./monitoring-benchmark";

test("builds competitive metrics and gaps from persisted monitoring attempts", () => {
  const profile = businessProfiles.create({
    name: `Benchmark Account ${crypto.randomUUID()}`,
    website: "https://benchmark-account.test",
    description: "Persisted monitoring benchmark account.",
  });
  businessProfiles.saveCompetitors(profile.id, ["Competitor A", "Competitor B", "Competitor C", "Competitor D", "Competitor E"]);
  const prompt = monitoringPrompts.add(profile.id, "Which platform has the most reliable customer support?");
  const runId = monitoringRuns.start(profile.id);

  monitoringRuns.addAttempt({
    runId,
    businessProfileId: profile.id,
    monitoringPromptId: prompt.id,
    provider: "openai",
    model: "mock",
    status: "success",
    rawResponse: `${profile.name} is a recommended and reliable option with good support.`,
    score: 0.8,
    mentionSentiment: "positive",
    mentionPosition: 0,
    recommended: true,
    featureSentiment: { support: "positive" },
    sources: [],
    error: null,
  });
  monitoringRuns.addAttempt({
    runId,
    businessProfileId: profile.id,
    monitoringPromptId: prompt.id,
    provider: "anthropic",
    model: "mock",
    status: "success",
    rawResponse: "Competitor A is the recommended option for reliable customer support.",
    score: 0.8,
    mentionSentiment: "positive",
    mentionPosition: 0,
    recommended: true,
    featureSentiment: { support: "positive" },
    sources: [],
    error: null,
  });
  monitoringRuns.finish(runId, "completed");

  const benchmark = buildMonitoringBenchmark(profile);
  const account = benchmark.overview.rows.find((row) => row.brandId === profile.id)!;
  const competitorId = benchmark.competitorBrandIds[0]!;
  const competitor = benchmark.overview.rows.find((row) => row.brandId === competitorId)!;

  expect(benchmark.hasData).toBeTrue();
  expect(account.shareOfVoice).toBe(0.5);
  expect(competitor.shareOfVoice).toBe(0.5);
  expect(account.sentiment).toBeGreaterThan(0);
  expect(benchmark.trends.seriesByBrand[profile.id]).toHaveLength(2);
  expect(benchmark.gaps.some((gap) =>
    gap.gapType === "prompt_exclusion" && gap.competitorBrandId === competitorId
  )).toBeTrue();
  expect(benchmark.gaps.some((gap) => gap.gapType === "feature_praise_gap")).toBeTrue();
});

test("does not mix monitoring evidence between profiles", () => {
  const profile = businessProfiles.create({
    name: `Empty Benchmark ${crypto.randomUUID()}`,
    website: "https://empty-benchmark.test",
    description: "No monitoring evidence.",
  });
  businessProfiles.saveCompetitors(profile.id, ["One", "Two", "Three", "Four", "Five"]);

  const benchmark = buildMonitoringBenchmark(profile);
  expect(benchmark.hasData).toBeFalse();
  expect(benchmark.overview.rows.every((row) => row.shareOfVoice === 0)).toBeTrue();
  expect(benchmark.gaps).toEqual([]);
});
