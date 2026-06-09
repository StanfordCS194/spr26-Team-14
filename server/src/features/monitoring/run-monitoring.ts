import { z } from "zod";
import type { BusinessProfile } from "../../db/business-profiles";
import { monitoringPrompts, type MentionSentiment } from "../../db/monitoring-prompts";
import { callStructuredLLM } from "../../lib/llm-providers";

const resultSchema = z.object({
  results: z.array(z.object({
    promptId: z.string(),
    score: z.number().min(-1).max(1),
    mentionSentiment: z.enum(["positive", "neutral", "negative"]),
    answerSummary: z.string().min(1),
    sources: z.array(z.string()).default([]),
  })),
});

function sentimentForScore(score: number): MentionSentiment {
  if (score >= 0.2) return "positive";
  if (score <= -0.2) return "negative";
  return "neutral";
}

function mockResults(profile: BusinessProfile, prompts: ReturnType<typeof monitoringPrompts.list>) {
  return {
    results: prompts.map((prompt, index) => {
      const score = [0.42, 0.1, -0.24][index % 3]!;
      return {
        promptId: prompt.id,
        score,
        mentionSentiment: sentimentForScore(score),
        answerSummary: `Mock monitoring summary for ${profile.name}: ${prompt.prompt.slice(0, 80)}`,
        sources: ["example.com"],
      };
    }),
  };
}

export async function runMonitoring(profile: BusinessProfile) {
  const prompts = monitoringPrompts.list(profile.id);
  if (prompts.length === 0) {
    return [];
  }

  monitoringPrompts.setStatus(profile.id, "generating");
  try {
    const result = await callStructuredLLM({
      model: "gpt-4.1-mini",
      schema: resultSchema,
      schemaName: "monitoring_run_results",
      useSearch: true,
      mockValue: mockResults(profile, prompts),
      prompt: `Run brand monitoring for these chatbot prompts.

Business: ${profile.name}
Website: ${profile.website}
Description: ${profile.description}

Prompts:
${prompts.map((prompt) => `- ${prompt.id}: ${prompt.prompt}`).join("\n")}

For each prompt, estimate whether the brand is mentioned positively, neutrally, or negatively in current AI-answerable source material. Return one result per prompt.`,
    });

    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    const saved = result.results
      .filter((item) => promptIds.has(item.promptId))
      .map((item) =>
        monitoringPrompts.addResult({
          businessProfileId: profile.id,
          monitoringPromptId: item.promptId,
          score: item.score,
          mentionSentiment: item.mentionSentiment,
          answerSummary: item.answerSummary,
          sources: item.sources,
        }),
      );

    monitoringPrompts.setStatus(profile.id, "ready");
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Monitoring run failed.";
    monitoringPrompts.setStatus(profile.id, "error", message);
    throw error;
  }
}

export function monitoringHistory(businessProfileId: string) {
  const results = monitoringPrompts.results(businessProfileId);
  return results.map((result) => ({
    t: result.createdAt,
    score: result.score,
  }));
}
