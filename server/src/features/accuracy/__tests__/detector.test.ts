import { describe, expect, test } from "bun:test";
import type { AIAnswer } from "../../competitive/types";
import { detectAccuracyFlags } from "../detector";
import type { FactSheet } from "../types";

function makeAnswer(text: string): AIAnswer {
  return {
    id: "answer-1",
    promptRunId: "prompt-run-1",
    brandId: "brand-1",
    answerText: text,
    createdAt: new Date().toISOString(),
  };
}

const baseFactSheet: FactSheet = {
  id: "fs-1",
  brandId: "brand-1",
  pricing: "$49 per month",
  foundedYear: 1969,
  headquarters: "San Francisco, CA",
  keyFeatures: [],
  executives: [],
  createdAt: new Date().toISOString(),
};

describe("accuracy detector", () => {
  test("flags a contradicted price", () => {
    const flags = detectAccuracyFlags({
      factSheet: baseFactSheet,
      answers: [makeAnswer("Plans start at $29 per month for the basic tier.")],
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.dimension).toBe("pricing");
    expect(flags[0]!.claim.includes("29")).toBeTrue();
  });

  test("does not flag a price within 10 percent of truth", () => {
    const flags = detectAccuracyFlags({
      factSheet: baseFactSheet,
      answers: [makeAnswer("Listed at $50/month, depending on tier.")],
    });
    expect(flags).toHaveLength(0);
  });

  test("flags a contradicted founding year only when founding context is present", () => {
    const flags = detectAccuracyFlags({
      factSheet: baseFactSheet,
      answers: [makeAnswer("Founded in 1972, the brand later revisited its identity in 2002.")],
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.dimension).toBe("founded_year");
    expect(flags[0]!.claim).toBe("1972");
  });

  test("flags a different headquarters city", () => {
    const flags = detectAccuracyFlags({
      factSheet: baseFactSheet,
      answers: [makeAnswer("The retailer is headquartered in New York and serves customers globally.")],
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.dimension).toBe("headquarters");
  });

  test("returns no flags when answer agrees with fact sheet", () => {
    const flags = detectAccuracyFlags({
      factSheet: baseFactSheet,
      answers: [
        makeAnswer(
          "Founded in 1969, the company is headquartered in San Francisco and most plans start at $49 per month.",
        ),
      ],
    });
    expect(flags).toHaveLength(0);
  });
});
