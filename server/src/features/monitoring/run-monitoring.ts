import { businessProfiles, type BusinessProfile } from "../../db/business-profiles";
import { recordCitationGrounding } from "../accuracy/analyze-citations";
import { monitoringPrompts } from "../../db/monitoring-prompts";
import {
  monitoringRuns,
  type MonitoringAttempt,
  type MonitoringProvider,
  type MonitoringRunStatus,
} from "../../db/monitoring-runs";
import { parseMonitoringResponse } from "./parse-response";
import { callMonitoringProvider } from "./providers";
import { recordAttemptSources } from "../sources/source-attribution";

export const defaultMonitoringProviders: MonitoringProvider[] = ["openai", "anthropic", "gemini"];

export async function runMonitoring(
  profile: BusinessProfile,
  providers: MonitoringProvider[] = defaultMonitoringProviders,
  dueOnly = false,
) {
  const activePrompts = monitoringPrompts.list(profile.id);
  const priorAttempts = monitoringRuns.attempts(profile.id);
  const prompts = dueOnly
    ? activePrompts.filter((prompt) => {
      const latest = priorAttempts
        .filter((attempt) => attempt.monitoringPromptId === prompt.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!latest) return true;
      const interval = prompt.cadence === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      return Date.now() - new Date(latest.createdAt).getTime() >= interval;
    })
    : activePrompts;
  const competitorNames = businessProfiles.competitors(profile.id);
  if (prompts.length === 0) {
    return { runId: null, status: "completed" as const, attempts: [] };
  }

  const runId = monitoringRuns.start(profile.id);
  monitoringPrompts.setStatus(profile.id, "generating");

  const attempts = await Promise.all(
    prompts.flatMap((prompt) =>
      providers.map(async (provider): Promise<MonitoringAttempt> => {
        try {
          const response = await callMonitoringProvider({
            provider,
            prompt: prompt.prompt,
            brandName: profile.name,
            competitorNames,
          });
          const parsed = parseMonitoringResponse(profile.name, response.text);
          const attempt = monitoringRuns.addAttempt({
            runId,
            businessProfileId: profile.id,
            monitoringPromptId: prompt.id,
            provider,
            model: response.model,
            status: "success",
            rawResponse: response.text,
            score: parsed.score,
            mentionSentiment: parsed.mentionSentiment,
            mentionPosition: parsed.mentionPosition,
            recommended: parsed.recommended,
            featureSentiment: parsed.featureSentiment,
            sources: parsed.sources,
            error: null,
          });
          monitoringPrompts.addResult({
            businessProfileId: profile.id,
            monitoringPromptId: prompt.id,
            score: parsed.score,
            mentionSentiment: parsed.mentionSentiment,
            answerSummary: response.text.slice(0, 280),
            sources: parsed.sources,
          });
          recordAttemptSources(profile, attempt);
          recordCitationGrounding(attempt);
          return attempt;
        } catch (error) {
          return monitoringRuns.addAttempt({
            runId,
            businessProfileId: profile.id,
            monitoringPromptId: prompt.id,
            provider,
            model: "unavailable",
            status: "error",
            rawResponse: null,
            score: null,
            mentionSentiment: null,
            mentionPosition: null,
            recommended: false,
            featureSentiment: {},
            sources: [],
            error: error instanceof Error ? error.message : "Provider request failed.",
          });
        }
      }),
    ),
  );

  const successes = attempts.filter((attempt) => attempt.status === "success").length;
  const status: MonitoringRunStatus =
    successes === attempts.length ? "completed" : successes === 0 ? "failed" : "partial";
  monitoringRuns.finish(runId, status);
  monitoringPrompts.setStatus(
    profile.id,
    successes === 0 ? "error" : "ready",
    status === "partial" ? "Some providers failed. Successful responses were saved." : successes === 0 ? "All providers failed." : null,
  );
  return { runId, status, attempts };
}

export function monitoringHistory(businessProfileId: string) {
  const attempts = monitoringRuns.attempts(businessProfileId).filter(
    (attempt): attempt is MonitoringAttempt & { score: number } =>
      attempt.status === "success" && attempt.score !== null,
  );
  if (attempts.length > 0) {
    return attempts.map((attempt) => ({ t: attempt.createdAt, score: attempt.score, provider: attempt.provider }));
  }
  return monitoringPrompts.results(businessProfileId).map((result) => ({
    t: result.createdAt,
    score: result.score,
    provider: "openai" as const,
  }));
}

export function monitoringSummary(businessProfileId: string) {
  const attempts = monitoringRuns.attempts(businessProfileId);
  const successful = attempts.filter((attempt) => attempt.status === "success");
  const mentioned = successful.filter((attempt) => attempt.mentionPosition !== null);
  const providerBreakdown = defaultMonitoringProviders.map((provider) => {
    const providerAttempts = attempts.filter((attempt) => attempt.provider === provider);
    const providerSuccesses = providerAttempts.filter((attempt) => attempt.status === "success");
    const scores = providerSuccesses.flatMap((attempt) => attempt.score === null ? [] : [attempt.score]);
    return {
      provider,
      attempts: providerAttempts.length,
      successes: providerSuccesses.length,
      mentions: providerSuccesses.filter((attempt) => attempt.mentionPosition !== null).length,
      errors: providerAttempts.filter((attempt) => attempt.status === "error").length,
      averageSentiment: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
    };
  });
  const latestRunId = attempts.at(-1)?.runId ?? null;

  return {
    totalResponses: successful.length,
    mentionFrequency: successful.length ? mentioned.length / successful.length : 0,
    recommendedResponses: successful.filter((attempt) => attempt.recommended).length,
    providerBreakdown,
    latestAttempts: latestRunId ? attempts.filter((attempt) => attempt.runId === latestRunId) : [],
  };
}
