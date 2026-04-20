import { beforeEach, describe, expect, test } from "bun:test";
import { resetStore, seedPromptSetId, store } from "../../../db/store";
import { runCompetitivePipeline } from "../pipeline";

describe("runCompetitivePipeline", () => {
  beforeEach(() => {
    resetStore();
  });

  test("runs 20 prompt panels (10 brand + 10 domain) across six brands", async () => {
    const accountBrand = { id: "brand-account", name: "YourBrand" };
    const competitors = ["A", "B", "C", "D", "E"].map((name) => ({
      id: `brand-${name}`,
      name: `Competitor ${name}`,
    }));
    store.brands.set(accountBrand.id, accountBrand);
    for (const competitor of competitors) {
      store.brands.set(competitor.id, competitor);
    }

    const result = await runCompetitivePipeline({
      accountBrandId: accountBrand.id,
      competitorBrandIds: [
        competitors[0]!.id,
        competitors[1]!.id,
        competitors[2]!.id,
        competitors[3]!.id,
        competitors[4]!.id,
      ],
      promptSetId: seedPromptSetId,
      models: ["gpt-4.1-mini"],
      windowStart: new Date(Date.now() - 1000).toISOString(),
      windowEnd: new Date().toISOString(),
    });

    expect(result.promptRuns.length).toBe(20);
    expect(result.answers.length).toBe(20 * 6);
    expect(result.comparisons.length).toBe(20);
    const brandIds = new Set(result.answers.map((answer) => answer.brandId));
    expect(brandIds.size).toBe(6);
  }, 180_000);
});
