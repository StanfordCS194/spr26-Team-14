import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { resetStore } from "../db/store";
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
});
