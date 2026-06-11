import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { resetStore } from "../db/store";
import { businessProfiles } from "../db/business-profiles";
import { businessRoutes } from "./business";
import { competitiveRoutes } from "./competitive";

describe("competitive routes", () => {
  const app = new Hono().route("/", competitiveRoutes);

  beforeEach(() => {
    resetStore();
  });

  test("creates competitive set with exactly 5 competitors", async () => {
    const response = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: "YourBrand",
        competitorNames: ["A", "B", "C", "D", "E"],
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.competitorBrandIds).toHaveLength(5);
  });

  test("links duplicate account names to distinct business profiles", async () => {
    const firstProfileId = crypto.randomUUID();
    const secondProfileId = crypto.randomUUID();
    const competitorNames = ["A", "B", "C", "D", "E"];

    const firstResponse = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: "Shared Name",
        businessProfileId: firstProfileId,
        competitorNames,
      }),
    });
    const secondResponse = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: "Shared Name",
        businessProfileId: secondProfileId,
        competitorNames,
      }),
    });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();
    expect(firstBody.accountBrandId).not.toBe(secondBody.accountBrandId);
  });

  test("returns 400 if overview params missing", async () => {
    const response = await app.request("/competitive/overview");
    expect(response.status).toBe(400);
  });

  test("demo: account brand + five competitors full benchmark run", async () => {
    const setRes = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: "Sephora",
        competitorNames: ["Ulta", "Bluemercury", "SpaceNK", "SallyBeauty", "Olive Young"],
      }),
    });
    expect(setRes.status).toBe(201);
    const setBody = await setRes.json();
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const runRes = await app.request("/competitive/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandId: setBody.accountBrandId,
        competitorBrandIds: setBody.competitorBrandIds,
        models: ["gpt-4.1-mini"],
        windowStart,
        windowEnd: new Date().toISOString(),
      }),
    });
    expect(runRes.status).toBe(200);
    const runBody = await runRes.json();
    expect(runBody.answerCount).toBe(120);
    expect(runBody.comparisons).toHaveLength(20);
    expect(runBody.recommendationCount).toBeGreaterThanOrEqual(0);
    expect(runBody.sourceCount).toBeGreaterThan(0);

    const windowEnd = new Date().toISOString();
    const overviewRes = await app.request(
      `/competitive/overview?windowStart=${encodeURIComponent(windowStart)}&windowEnd=${encodeURIComponent(windowEnd)}`,
    );
    expect(overviewRes.status).toBe(200);
    const overview = await overviewRes.json();
    expect(overview.rows.length).toBeGreaterThan(0);
  }, 180_000);

  test("benchmark run persists recommendations to SQLite for its business profile", async () => {
    const businessApp = new Hono().route("/", businessRoutes);
    const profile = businessProfiles.create({
      name: `Bench Co ${crypto.randomUUID()}`,
      website: "https://bench.example.com",
      description: "Benchmark persistence fixture.",
    });

    const setRes = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: profile.name,
        businessProfileId: profile.id,
        competitorNames: ["Rival1", "Rival2", "Rival3", "Rival4", "Rival5"],
      }),
    });
    const setBody = await setRes.json();

    const runRes = await app.request("/competitive/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessProfileId: profile.id,
        accountBrandId: setBody.accountBrandId,
        competitorBrandIds: setBody.competitorBrandIds,
        models: ["gpt-4.1-mini"],
        windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date().toISOString(),
      }),
    });
    expect(runRes.status).toBe(200);
    const runBody = await runRes.json();
    expect(runBody.persistedRecommendationCount).toBeGreaterThan(0);

    const recsRes = await businessApp.request(`/business-profiles/${profile.id}/recommendations`);
    expect(recsRes.status).toBe(200);
    const recsBody = await recsRes.json();
    expect(recsBody.recommendations.length).toBe(runBody.persistedRecommendationCount);
  }, 180_000);

  test("benchmark run persists snapshot + citations that survive a server restart", async () => {
    const profile = businessProfiles.create({
      name: `Snapshot Co ${crypto.randomUUID()}`,
      website: "https://snapshot.example.com",
      description: "Snapshot persistence fixture.",
    });

    const setRes = await app.request("/competitive-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountBrandName: profile.name,
        businessProfileId: profile.id,
        competitorNames: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"],
      }),
    });
    const setBody = await setRes.json();

    const runRes = await app.request("/competitive/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessProfileId: profile.id,
        accountBrandId: setBody.accountBrandId,
        competitorBrandIds: setBody.competitorBrandIds,
        models: ["gpt-4.1-mini"],
        windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date().toISOString(),
      }),
    });
    expect(runRes.status).toBe(200);
    const runBody = await runRes.json();
    expect(runBody.persistedSnapshot).toBe(true);

    // Simulate a server restart: the in-memory store is wiped, but a fresh
    // router must still serve the benchmark from SQLite.
    resetStore();
    const restartedApp = new Hono().route("/", businessRoutes);

    const monitoringRes = await restartedApp.request(`/business-profiles/${profile.id}/competitive-monitoring`);
    expect(monitoringRes.status).toBe(200);
    const monitoring = await monitoringRes.json();
    expect(monitoring.hasData).toBe(true);
    expect(monitoring.overview.rows.length).toBeGreaterThan(0);
    expect(monitoring.gaps.length).toBeGreaterThan(0);

    const citationsRes = await restartedApp.request(`/business-profiles/${profile.id}/benchmark-citations`);
    expect(citationsRes.status).toBe(200);
    const citations = await citationsRes.json();
    expect(citations.citations.length).toBeGreaterThan(0);
  }, 180_000);
});
