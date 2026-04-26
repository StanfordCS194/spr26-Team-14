import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { callLLM, callStructuredLLM, isLLMProviderConfigured } from "./llm-providers";

describe("llm providers", () => {
  test("calls the selected mock provider with one prompt", async () => {
    const chunks: string[] = [];
    const text = await callLLM({
      provider: "mock",
      model: "demo-model",
      prompt: "Summarize Perception in one sentence.",
      onDelta: (chunk) => chunks.push(chunk),
    });

    expect(text.includes("Summarize Perception")).toBeTrue();
    expect(chunks.length).toBe(1);
  });

  test("reports mock configured", () => {
    expect(isLLMProviderConfigured("mock")).toBeTrue();
  });

  test("returns mock structured data", async () => {
    const schema = z.object({ prompts: z.array(z.string()) });
    const data = await callStructuredLLM({
      provider: "mock",
      prompt: "Generate prompts",
      schema,
      schemaName: "prompt_list",
      mockValue: { prompts: ["best analytics tool"] },
    });

    expect(data.prompts).toEqual(["best analytics tool"]);
  });
});
