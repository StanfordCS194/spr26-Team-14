import { Hono } from "hono";
import { expect, test } from "bun:test";
import { businessProfiles } from "../db/business-profiles";
import { monitoringPrompts } from "../db/monitoring-prompts";
import { monitoringRuns } from "../db/monitoring-runs";
import { profileRecommendations } from "../db/profile-recommendations";
import { store } from "../db/store";
import { recordAttemptSources } from "../features/sources/source-attribution";
import { businessRoutes } from "./business";

process.env.DISABLE_ONBOARDING_PROMPT_GENERATION = "1";

const app = new Hono().route("/", businessRoutes);

function recordSourceForProfile(
  profile: ReturnType<typeof businessProfiles.create>,
  url: string,
  provider: "openai" | "anthropic" | "gemini" = "openai",
) {
  const prompt = monitoringPrompts.add(profile.id, `Which source describes ${profile.name} accurately?`);
  const runId = monitoringRuns.start(profile.id);
  const attempt = monitoringRuns.addAttempt({
    runId,
    businessProfileId: profile.id,
    monitoringPromptId: prompt.id,
    provider,
    model: "mock",
    status: "success",
    rawResponse: `${profile.name} is discussed at ${url}`,
    score: 0.4,
    mentionSentiment: "positive",
    mentionPosition: 0,
    recommended: false,
    featureSentiment: {},
    sources: [url],
    error: null,
  });
  monitoringRuns.finish(runId, "completed");
  recordAttemptSources(profile, attempt);
}

test("creates and lists business profiles", async () => {
  const name = `Acme ${crypto.randomUUID()}`;
  const createRes = await app.request("/business-profiles", {
    method: "POST",
    body: JSON.stringify({
      name,
      website: "https://acme.test",
      description: "Project management software for growing teams.",
    }),
    headers: { "content-type": "application/json" },
  });

  expect(createRes.status).toBe(201);
  const created = await createRes.json();
  expect(created.name).toBe(name);

  const listRes = await app.request("/business-profiles");
  const listBody = await listRes.json();
  expect(listBody.profiles.some((profile: { id: string }) => profile.id === created.id)).toBe(true);
  expect(businessProfiles.get(created.id)?.website).toBe("https://acme.test");
});

test("saves competitors for a business profile", async () => {
  const profile = businessProfiles.create({
    name: `Bench ${crypto.randomUUID()}`,
    website: "https://bench.test",
    description: "Benchmarking test profile.",
  });

  const response = await app.request(`/business-profiles/${profile.id}/competitors`, {
    method: "PUT",
    body: JSON.stringify({ competitorNames: ["A", "B", "C", "D", "E"] }),
    headers: { "content-type": "application/json" },
  });

  expect(response.status).toBe(200);
  expect((await response.json()).competitorNames).toEqual(["A", "B", "C", "D", "E"]);
});

test("adds monitoring prompts for a business profile", async () => {
  const profile = businessProfiles.create({
    name: `Monitor ${crypto.randomUUID()}`,
    website: "https://monitor.test",
    description: "Monitoring test profile.",
  });

  const response = await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "What is the best monitoring platform for AI search?" }),
    headers: { "content-type": "application/json" },
  });
  expect(response.status).toBe(201);

  const listRes = await app.request(`/business-profiles/${profile.id}/monitoring`);
  const listBody = await listRes.json();
  expect(listBody.prompts).toHaveLength(1);
  expect(listBody.prompts[0].mentionSentiment).toBeTruthy();
});

test("saves recommendation feedback and reports admin metrics", async () => {
  const profile = businessProfiles.create({
    name: `Feedback ${crypto.randomUUID()}`,
    website: "https://feedback.test",
    description: "Feedback test profile.",
  });
  const brand = { id: crypto.randomUUID(), name: profile.name };
  store.brands.set(brand.id, brand);
  store.businessProfileBrandIds.set(profile.id, brand.id);
  store.recommendations.push({
    id: "rec-1",
    brandId: brand.id,
    sourceGapEventId: crypto.randomUUID(),
    title: "Improve live proof points",
    category: "content",
    impact: "high",
    effort: "medium",
    evidence: "A gap was detected.",
    action: "Publish the proof point.",
    createdAt: new Date().toISOString(),
  });
  profileRecommendations.upsert({
    businessProfileId: profile.id,
    sourceGapEventId: "gap-feedback",
    sourceAttemptId: crypto.randomUUID(),
    title: "Improve live proof points",
    category: "content",
    impact: "high",
    effort: "medium",
    evidence: "A gap was detected.",
    action: "Publish the proof point.",
    targetProvider: "openai",
  });

  const saveRes = await app.request(`/business-profiles/${profile.id}/recommendation-feedback`, {
    method: "PUT",
    body: JSON.stringify({ recommendationId: "rec-1", rating: "good" }),
    headers: { "content-type": "application/json" },
  });
  expect(saveRes.status).toBe(200);
  expect((await saveRes.json()).rating).toBe("good");

  const updateRes = await app.request(`/business-profiles/${profile.id}/recommendation-feedback`, {
    method: "PUT",
    body: JSON.stringify({ recommendationId: "rec-1", rating: "bad" }),
    headers: { "content-type": "application/json" },
  });
  expect(updateRes.status).toBe(200);

  const listRes = await app.request(`/business-profiles/${profile.id}/recommendation-feedback`);
  const listBody = await listRes.json();
  expect(listBody.feedback).toHaveLength(1);
  expect(listBody.feedback[0].rating).toBe("bad");

  const metricsRes = await app.request(`/business-profiles/${profile.id}/admin/metrics?recommendationCount=3`);
  expect(metricsRes.status).toBe(200);
  expect((await metricsRes.json()).recommendationFeedback).toEqual({
    total: 1,
    good: 0,
    bad: 1,
    unrated: 0,
  });
});

test("returns live recommendations and source attributions for matching brand", async () => {
  const profile = businessProfiles.create({
    name: `LiveBrand ${crypto.randomUUID()}`,
    website: "https://livebrand.test",
    description: "Live demo test profile.",
  });
  const brand = { id: crypto.randomUUID(), name: profile.name };
  store.brands.set(brand.id, brand);
  store.businessProfileBrandIds.set(profile.id, brand.id);
  store.recommendations.push({
    id: "rec-live",
    brandId: brand.id,
    sourceGapEventId: crypto.randomUUID(),
    title: "Close the value gap",
    category: "content",
    impact: "high",
    effort: "low",
    evidence: "A competitor owns value perception.",
    action: "Publish a comparison page.",
    createdAt: new Date().toISOString(),
  });
  profileRecommendations.upsert({
    businessProfileId: profile.id,
    sourceGapEventId: "gap-live",
    sourceAttemptId: crypto.randomUUID(),
    title: "Close the value gap",
    category: "content",
    impact: "high",
    effort: "low",
    evidence: "A competitor owns value perception.",
    action: "Publish a comparison page.",
    targetProvider: "openai",
  });
  store.citedSources.push({
    id: "src-live",
    brandId: brand.id,
    domain: "example.com",
    title: "Streaming comparison",
    citationsThisWeek: 2,
    brandsMentioned: [profile.name],
    sentiment: "neutral",
    sourceType: "publication",
    createdAt: new Date().toISOString(),
  });
  recordSourceForProfile(profile, "https://www.example.com/streaming?utm_source=test");
  recordSourceForProfile(profile, "https://example.com/streaming/?ref=duplicate", "gemini");

  const recRes = await app.request(`/business-profiles/${profile.id}/recommendations`);
  expect(recRes.status).toBe(200);
  expect((await recRes.json()).recommendations).toHaveLength(1);

  const sourceRes = await app.request(`/business-profiles/${profile.id}/sources`);
  expect(sourceRes.status).toBe(200);
  const sourceBody = await sourceRes.json();
  expect(sourceBody.sources[0].domain).toBe("example.com");
  expect(sourceBody.sources[0].citationsThisWeek).toBe(2);
  expect(new Set(sourceBody.sources[0].providers)).toEqual(new Set(["openai", "gemini"]));
  expect(sourceBody.sources[0].relatedRecommendationIds).toHaveLength(1);

  const geminiSources = await (
    await app.request(`/business-profiles/${profile.id}/sources?provider=gemini`)
  ).json();
  expect(geminiSources.sources).toHaveLength(1);
  expect(geminiSources.sources[0].citationsThisWeek).toBe(1);
});

test("keeps recommendations and sources isolated for duplicate profile names", async () => {
  const sharedName = `Duplicate ${crypto.randomUUID()}`;
  const firstProfile = businessProfiles.create({
    name: sharedName,
    website: "https://first.test",
    description: "First duplicate-name test profile.",
  });
  const secondProfile = businessProfiles.create({
    name: sharedName,
    website: "https://second.test",
    description: "Second duplicate-name test profile.",
  });
  const firstBrand = { id: crypto.randomUUID(), name: sharedName };
  const secondBrand = { id: crypto.randomUUID(), name: sharedName };
  store.brands.set(firstBrand.id, firstBrand);
  store.brands.set(secondBrand.id, secondBrand);
  store.businessProfileBrandIds.set(firstProfile.id, firstBrand.id);
  store.businessProfileBrandIds.set(secondProfile.id, secondBrand.id);
  store.recommendations.push(
    {
      id: "rec-first-duplicate",
      brandId: firstBrand.id,
      sourceGapEventId: crypto.randomUUID(),
      title: "First profile recommendation",
      category: "content",
      impact: "high",
      effort: "low",
      evidence: "First profile evidence.",
      action: "Act on first profile.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rec-second-duplicate",
      brandId: secondBrand.id,
      sourceGapEventId: crypto.randomUUID(),
      title: "Second profile recommendation",
      category: "content",
      impact: "high",
      effort: "low",
      evidence: "Second profile evidence.",
      action: "Act on second profile.",
      createdAt: new Date().toISOString(),
    },
  );
  profileRecommendations.upsert({
    businessProfileId: firstProfile.id,
    sourceGapEventId: "gap-first-duplicate",
    sourceAttemptId: crypto.randomUUID(),
    title: "First profile recommendation",
    category: "content",
    impact: "high",
    effort: "low",
    evidence: "First profile evidence.",
    action: "Act on first profile.",
    targetProvider: "openai",
  });
  profileRecommendations.upsert({
    businessProfileId: secondProfile.id,
    sourceGapEventId: "gap-second-duplicate",
    sourceAttemptId: crypto.randomUUID(),
    title: "Second profile recommendation",
    category: "content",
    impact: "high",
    effort: "low",
    evidence: "Second profile evidence.",
    action: "Act on second profile.",
    targetProvider: "openai",
  });
  store.citedSources.push(
    {
      id: "src-first-duplicate",
      brandId: firstBrand.id,
      domain: "first.example",
      title: "First duplicate source",
      citationsThisWeek: 2,
      brandsMentioned: [sharedName],
      sentiment: "neutral",
      sourceType: "publication",
      createdAt: new Date().toISOString(),
    },
    {
      id: "src-second-duplicate",
      brandId: secondBrand.id,
      domain: "second.example",
      title: "Second duplicate source",
      citationsThisWeek: 2,
      brandsMentioned: [sharedName],
      sentiment: "neutral",
      sourceType: "publication",
      createdAt: new Date().toISOString(),
    },
  );
  recordSourceForProfile(firstProfile, "https://first.example/article");
  recordSourceForProfile(secondProfile, "https://second.example/article");

  const firstRecommendationsRes = await app.request(`/business-profiles/${firstProfile.id}/recommendations`);
  const secondRecommendationsRes = await app.request(`/business-profiles/${secondProfile.id}/recommendations`);
  expect((await firstRecommendationsRes.json()).recommendations.map((rec: { title: string }) => rec.title)).toContain(
    "First profile recommendation",
  );
  expect((await secondRecommendationsRes.json()).recommendations.map((rec: { title: string }) => rec.title)).toContain(
    "Second profile recommendation",
  );

  const firstSourcesRes = await app.request(`/business-profiles/${firstProfile.id}/sources`);
  const secondSourcesRes = await app.request(`/business-profiles/${secondProfile.id}/sources`);
  expect((await firstSourcesRes.json()).sources.map((source: { domain: string }) => source.domain)).toEqual([
    "first.example",
  ]);
  expect((await secondSourcesRes.json()).sources.map((source: { domain: string }) => source.domain)).toEqual([
    "second.example",
  ]);
});

test("runs monitoring and returns sentiment history", async () => {
  const profile = businessProfiles.create({
    name: `MonitorRun ${crypto.randomUUID()}`,
    website: "https://monitor-run.test",
    description: "Monitoring run profile.",
  });
  await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "What is the best monitoring platform for AI answers?" }),
    headers: { "content-type": "application/json" },
  });

  const runRes = await app.request(`/business-profiles/${profile.id}/monitoring/runs`, { method: "POST" });
  expect(runRes.status).toBe(200);
  const runBody = await runRes.json();
  expect(runBody.status).toBe("completed");
  expect(runBody.attempts).toHaveLength(3);
  expect(new Set(runBody.attempts.map((attempt: { provider: string }) => attempt.provider))).toEqual(
    new Set(["openai", "anthropic", "gemini"]),
  );
  expect(runBody.attempts.every((attempt: { rawResponse: string }) => attempt.rawResponse.includes(profile.name))).toBeTrue();
  expect(monitoringRuns.attempts(profile.id)).toHaveLength(3);

  const monitoringRes = await app.request(`/business-profiles/${profile.id}/monitoring`);
  const monitoringBody = await monitoringRes.json();
  expect(monitoringBody.history).toHaveLength(3);
  expect(monitoringBody.summary.totalResponses).toBe(3);
  expect(monitoringBody.summary.mentionFrequency).toBe(1);
  expect(monitoringBody.prompts[0].mentionSentiment).toBeTruthy();
});

test("keeps successful monitoring responses when one provider fails", async () => {
  const profile = businessProfiles.create({
    name: `PartialRun ${crypto.randomUUID()}`,
    website: "https://partial-run.test",
    description: "Partial provider failure profile.",
  });
  await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "Which AI visibility platform should a brand use?" }),
    headers: { "content-type": "application/json" },
  });

  process.env.PERCEPTION_MOCK_PROVIDER_FAILURES = "anthropic";
  try {
    const runRes = await app.request(`/business-profiles/${profile.id}/monitoring/runs`, {
      method: "POST",
      body: JSON.stringify({ providers: ["openai", "anthropic", "gemini"] }),
      headers: { "content-type": "application/json" },
    });
    const runBody = await runRes.json();
    expect(runBody.status).toBe("partial");
    expect(runBody.attempts.filter((attempt: { status: string }) => attempt.status === "success")).toHaveLength(2);
    expect(runBody.attempts.find((attempt: { provider: string }) => attempt.provider === "anthropic").error).toContain(
      "mock failure",
    );

    const monitoringBody = await (
      await app.request(`/business-profiles/${profile.id}/monitoring`)
    ).json();
    expect(monitoringBody.summary.totalResponses).toBe(2);
    expect(monitoringBody.summary.providerBreakdown.find(
      (item: { provider: string }) => item.provider === "anthropic",
    ).errors).toBe(1);
  } finally {
    delete process.env.PERCEPTION_MOCK_PROVIDER_FAILURES;
  }
});

test("tracks recommendation lifecycle and before-after monitoring lift", async () => {
  const profile = businessProfiles.create({
    name: `Recommendation Lift ${crypto.randomUUID()}`,
    website: "https://recommendation-lift.test",
    description: "Recommendation lifecycle profile.",
  });
  businessProfiles.saveCompetitors(profile.id, ["Lift Competitor", "Two", "Three", "Four", "Five"]);
  const promptRes = await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "Which platform has the most reliable support?" }),
    headers: { "content-type": "application/json" },
  });
  const prompt = await promptRes.json();
  const runId = monitoringRuns.start(profile.id);
  monitoringRuns.addAttempt({
    runId,
    businessProfileId: profile.id,
    monitoringPromptId: prompt.id,
    provider: "anthropic",
    model: "mock",
    status: "success",
    rawResponse: "Lift Competitor is the recommended option for reliable support.",
    score: -0.4,
    mentionSentiment: "negative",
    mentionPosition: null,
    recommended: false,
    featureSentiment: {},
    sources: [],
    error: null,
  });
  monitoringRuns.finish(runId, "completed");

  const recommendationsBody = await (
    await app.request(`/business-profiles/${profile.id}/recommendations`)
  ).json();
  expect(recommendationsBody.recommendations.length).toBeGreaterThan(0);
  const recommendation = recommendationsBody.recommendations[0];

  const statusRes = await app.request(
    `/business-profiles/${profile.id}/recommendations/${recommendation.id}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status: "completed" }),
      headers: { "content-type": "application/json" },
    },
  );
  expect((await statusRes.json()).status).toBe("completed");

  await Bun.sleep(2);
  const followupRunId = monitoringRuns.start(profile.id);
  monitoringRuns.addAttempt({
    runId: followupRunId,
    businessProfileId: profile.id,
    monitoringPromptId: prompt.id,
    provider: "anthropic",
    model: "mock",
    status: "success",
    rawResponse: `${profile.name} is a recommended option with reliable support.`,
    score: 0.8,
    mentionSentiment: "positive",
    mentionPosition: 0,
    recommended: true,
    featureSentiment: { support: "positive" },
    sources: [],
    error: null,
  });
  monitoringRuns.finish(followupRunId, "completed");

  const updatedBody = await (
    await app.request(`/business-profiles/${profile.id}/recommendations`)
  ).json();
  const updated = updatedBody.recommendations.find((item: { id: string }) => item.id === recommendation.id);
  expect(updated.lift.beforeScore).toBe(-0.4);
  expect(updated.lift.afterScore).toBe(0.8);
  expect(updated.lift.delta).toBeCloseTo(1.2);
});

test("creates deduplicated Accuracy Guard alerts from profile facts", async () => {
  const profile = businessProfiles.create({
    name: `Accuracy ${crypto.randomUUID()}`,
    website: "https://accuracy.test",
    description: "Accuracy Guard test profile.",
  });
  const factRes = await app.request(`/business-profiles/${profile.id}/facts`, {
    method: "POST",
    body: JSON.stringify({
      category: "feature",
      label: "customer support",
      value: "24/7 phone support",
    }),
    headers: { "content-type": "application/json" },
  });
  expect(factRes.status).toBe(201);

  await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "Which platform has reliable customer support?" }),
    headers: { "content-type": "application/json" },
  });
  const runRes = await app.request(`/business-profiles/${profile.id}/monitoring/runs`, {
    method: "POST",
    body: JSON.stringify({ providers: ["openai", "anthropic", "gemini"] }),
    headers: { "content-type": "application/json" },
  });
  expect(runRes.status).toBe(200);

  const alertsRes = await app.request(`/business-profiles/${profile.id}/accuracy-alerts`);
  const alertsBody = await alertsRes.json();
  expect(alertsBody.alerts).toHaveLength(1);
  expect(alertsBody.alerts[0].severity).toBe("medium");
  expect(alertsBody.alerts[0].expectedValue).toBe("24/7 phone support");
  expect(alertsBody.delivery.inApp).toBeTrue();

  const acknowledgeRes = await app.request(
    `/business-profiles/${profile.id}/accuracy-alerts/${alertsBody.alerts[0].id}/acknowledge`,
    { method: "PUT" },
  );
  expect(acknowledgeRes.status).toBe(200);
  expect((await acknowledgeRes.json()).status).toBe("acknowledged");
});

test("keeps fact sheets isolated between duplicate profile names", async () => {
  const name = `Fact Duplicate ${crypto.randomUUID()}`;
  const first = businessProfiles.create({
    name,
    website: "https://fact-first.test",
    description: "First fact profile.",
  });
  const second = businessProfiles.create({
    name,
    website: "https://fact-second.test",
    description: "Second fact profile.",
  });
  const createFactRes = await app.request(`/business-profiles/${first.id}/facts`, {
    method: "POST",
    body: JSON.stringify({ category: "pricing", label: "starting price", value: "$49" }),
    headers: { "content-type": "application/json" },
  });
  const fact = await createFactRes.json();

  expect((await (await app.request(`/business-profiles/${first.id}/facts`)).json()).facts).toHaveLength(1);
  expect((await (await app.request(`/business-profiles/${second.id}/facts`)).json()).facts).toEqual([]);

  const updateRes = await app.request(`/business-profiles/${first.id}/facts/${fact.id}`, {
    method: "PUT",
    body: JSON.stringify({ category: "pricing", label: "starting price", value: "$59", active: false }),
    headers: { "content-type": "application/json" },
  });
  expect((await updateRes.json()).active).toBeFalse();

  const deleteRes = await app.request(`/business-profiles/${first.id}/facts/${fact.id}`, { method: "DELETE" });
  expect(deleteRes.status).toBe(204);
  expect((await (await app.request(`/business-profiles/${first.id}/facts`)).json()).facts).toEqual([]);
});

test("keeps recommendation feedback isolated for duplicate profile names", async () => {
  const name = `Duplicate ${crypto.randomUUID()}`;
  const firstProfile = businessProfiles.create({
    name,
    website: "https://first.test",
    description: "First duplicate-name profile.",
  });
  const secondProfile = businessProfiles.create({
    name,
    website: "https://second.test",
    description: "Second duplicate-name profile.",
  });
  const firstBrand = { id: crypto.randomUUID(), name };
  const secondBrand = { id: crypto.randomUUID(), name };
  store.brands.set(firstBrand.id, firstBrand);
  store.brands.set(secondBrand.id, secondBrand);
  store.businessProfileBrandIds.set(firstProfile.id, firstBrand.id);
  store.businessProfileBrandIds.set(secondProfile.id, secondBrand.id);
  store.recommendations.push({
    id: "rec-second-feedback",
    brandId: secondBrand.id,
    sourceGapEventId: crypto.randomUUID(),
    title: "Second profile recommendation",
    category: "content",
    impact: "medium",
    effort: "low",
    evidence: "Second profile evidence.",
    action: "Act on the second profile.",
    createdAt: new Date().toISOString(),
  });
  profileRecommendations.upsert({
    businessProfileId: secondProfile.id,
    sourceGapEventId: "gap-second-feedback",
    sourceAttemptId: crypto.randomUUID(),
    title: "Second profile recommendation",
    category: "content",
    impact: "medium",
    effort: "low",
    evidence: "Second profile evidence.",
    action: "Act on the second profile.",
    targetProvider: "openai",
  });

  const saveRes = await app.request(`/business-profiles/${firstProfile.id}/recommendation-feedback`, {
    method: "PUT",
    body: JSON.stringify({ recommendationId: "rec-duplicate", rating: "good" }),
    headers: { "content-type": "application/json" },
  });
  expect(saveRes.status).toBe(200);

  const firstListRes = await app.request(`/business-profiles/${firstProfile.id}/recommendation-feedback`);
  const secondListRes = await app.request(`/business-profiles/${secondProfile.id}/recommendation-feedback`);
  expect((await firstListRes.json()).feedback).toHaveLength(1);
  expect((await secondListRes.json()).feedback).toEqual([]);

  const secondMetricsRes = await app.request(`/business-profiles/${secondProfile.id}/admin/metrics`);
  expect((await secondMetricsRes.json()).recommendationFeedback).toEqual({
    total: 0,
    good: 0,
    bad: 0,
    unrated: 1,
  });
});
