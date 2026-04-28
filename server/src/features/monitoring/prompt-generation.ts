import { z } from "zod";
import type { BusinessProfile } from "../../db/business-profiles";
import { monitoringPrompts } from "../../db/monitoring-prompts";
import { callStructuredLLM } from "../../lib/llm-providers";

const promptResultSchema = z.object({
  prompts: z.array(z.string().min(8)).length(5),
});

function fallbackPrompts(profile: BusinessProfile) {
  return [
    `What are the best tools like ${profile.name}?`,
    `Which companies help with ${profile.description}?`,
    `Compare ${profile.name} with alternatives`,
    `What should I use for ${profile.website}?`,
    `Best solution for teams needing ${profile.description}`,
  ];
}

export async function generateMonitoringPrompts(profile: BusinessProfile) {
  monitoringPrompts.setStatus(profile.id, "generating");
  try {
    const result = await callStructuredLLM({
      provider: "openai",
      model: "gpt-4.1-mini",
      prompt: `Generate exactly 5 natural language chatbot queries where this business might show up.

Business name: ${profile.name}
Website: ${profile.website}
Description: ${profile.description}

Make the prompts realistic things a buyer would type into ChatGPT, Claude, Gemini, or Perplexity.
Return only the structured prompt list.`,
      schema: promptResultSchema,
      schemaName: "monitoring_prompt_list",
      useSearch: true,
      mockValue: { prompts: fallbackPrompts(profile) },
    });
    monitoringPrompts.replaceAll(profile.id, result.prompts);
    monitoringPrompts.setStatus(profile.id, "ready");
  } catch (error) {
    monitoringPrompts.replaceAll(profile.id, fallbackPrompts(profile));
    monitoringPrompts.setStatus(profile.id, "error", error instanceof Error ? error.message : "Prompt generation failed.");
  }
}
