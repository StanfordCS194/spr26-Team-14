import { Hono } from "hono";
import { expect, test } from "bun:test";
import { businessProfiles } from "../db/business-profiles";
import { store } from "../db/store";
import { businessRoutes } from "./business";

process.env.DISABLE_ONBOARDING_PROMPT_GENERATION = "1";

const app = new Hono().route("/", businessRoutes);

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

  const recRes = await app.request(`/business-profiles/${profile.id}/recommendations`);
  expect(recRes.status).toBe(200);
  expect((await recRes.json()).recommendations).toHaveLength(1);

  const sourceRes = await app.request(`/business-profiles/${profile.id}/sources`);
  expect(sourceRes.status).toBe(200);
  expect((await sourceRes.json()).sources[0].domain).toBe("example.com");
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

  const firstRecommendationsRes = await app.request(`/business-profiles/${firstProfile.id}/recommendations`);
  const secondRecommendationsRes = await app.request(`/business-profiles/${secondProfile.id}/recommendations`);
  expect((await firstRecommendationsRes.json()).recommendations.map((rec: { id: string }) => rec.id)).toContain(
    "rec-first-duplicate",
  );
  expect((await secondRecommendationsRes.json()).recommendations.map((rec: { id: string }) => rec.id)).toContain(
    "rec-second-duplicate",
  );

  const firstSourcesRes = await app.request(`/business-profiles/${firstProfile.id}/sources`);
  const secondSourcesRes = await app.request(`/business-profiles/${secondProfile.id}/sources`);
  expect((await firstSourcesRes.json()).sources.map((source: { id: string }) => source.id)).toEqual([
    "src-first-duplicate",
  ]);
  expect((await secondSourcesRes.json()).sources.map((source: { id: string }) => source.id)).toEqual([
    "src-second-duplicate",
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
  expect((await runRes.json()).results).toHaveLength(1);

  const monitoringRes = await app.request(`/business-profiles/${profile.id}/monitoring`);
  const monitoringBody = await monitoringRes.json();
  expect(monitoringBody.history).toHaveLength(1);
  expect(monitoringBody.prompts[0].mentionSentiment).toBeTruthy();
});
