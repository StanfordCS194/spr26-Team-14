import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { resetStore, store } from "../db/store";
import { accuracyRoutes } from "./accuracy";

describe("accuracy routes", () => {
  const app = new Hono().route("/", accuracyRoutes);

  beforeEach(() => {
    resetStore();
  });

  function seedBrandWithAnswer(answerText: string) {
    const brandId = "brand-1";
    store.brands.set(brandId, { id: brandId, name: "Sephora" });
    const promptRunId = "prompt-run-1";
    store.promptRuns.set(promptRunId, {
      id: promptRunId,
      promptSetId: "prompt-set-1",
      prompt: "How is Sephora priced?",
      promptKind: "brand_specific",
      model: "mock",
      createdAt: new Date().toISOString(),
    });
    const answerId = crypto.randomUUID();
    store.answers.set(answerId, {
      id: answerId,
      promptRunId,
      brandId,
      answerText,
      createdAt: new Date().toISOString(),
    });
    return { brandId };
  }

  test("rejects fact sheet for unknown brand", async () => {
    const res = await app.request("/accuracy/fact-sheet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId: "missing", pricing: "$49/month" }),
    });
    expect(res.status).toBe(404);
  });

  test("flags contradiction across the full fact-sheet → run → flags flow", async () => {
    const { brandId } = seedBrandWithAnswer(
      "Subscriptions are $29 per month per seat for new customers.",
    );

    const sheetRes = await app.request("/accuracy/fact-sheet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId, pricing: "$49 per month" }),
    });
    expect(sheetRes.status).toBe(201);

    const runRes = await app.request("/accuracy/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId }),
    });
    expect(runRes.status).toBe(200);
    const runBody = await runRes.json();
    expect(runBody.scannedAnswers).toBe(1);
    expect(runBody.flagged).toBe(1);

    const flagsRes = await app.request(`/accuracy/flags?brandId=${brandId}`);
    expect(flagsRes.status).toBe(200);
    const flagsBody = await flagsRes.json();
    expect(flagsBody.count).toBe(1);
    expect(flagsBody.flags[0].dimension).toBe("pricing");
  });

  test("requires brandId on flags query", async () => {
    const res = await app.request("/accuracy/flags");
    expect(res.status).toBe(400);
  });
});
