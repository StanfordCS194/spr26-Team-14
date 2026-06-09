import { Hono } from "hono";
import { z } from "zod";
import { citationGrounding } from "../db/citation-grounding";
import { businessProfiles } from "../db/business-profiles";
import { monitoringPrompts } from "../db/monitoring-prompts";
import { monitoringRuns } from "../db/monitoring-runs";
import { profileRecommendations } from "../db/profile-recommendations";
import { recommendationFeedback } from "../db/recommendation-feedback";
import { buildMonitoringBenchmark } from "../features/competitive/monitoring-benchmark";
import { syncProfileRecommendations } from "../features/fixit/profile-recommendations";
import { aggregateSources } from "../features/sources/source-attribution";
import {
  defaultMonitoringProviders,
  monitoringHistory,
  monitoringSummary,
  runMonitoring,
} from "../features/monitoring/run-monitoring";
import { generateMonitoringPrompts } from "../features/monitoring/prompt-generation";
import { recordCitationGrounding } from "../features/accuracy/analyze-citations";
import { isLLMProviderConfigured } from "../lib/llm-providers";

const profileSchema = z.object({
  name: z.string().trim().min(1),
  website: z.string().trim().url(),
  description: z.string().trim().min(1),
  competitorNames: z.array(z.string().trim().min(1)).length(5).optional(),
});

export const businessRoutes = new Hono();

businessRoutes.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return c.json({ error: "Invalid request.", issues: error.issues }, 400);
  }
  console.error(error);
  return c.json({ error: "Unexpected server error." }, 500);
});

businessRoutes.get("/business-profiles", (c) => {
  return c.json({ profiles: businessProfiles.list() });
});

businessRoutes.get("/business-profiles/:id", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  return profile ? c.json(profile) : c.json({ error: "Business profile not found." }, 404);
});

businessRoutes.post("/business-profiles", async (c) => {
  const body = profileSchema.parse(await c.req.json());
  const profile = businessProfiles.create(body);
  if (body.competitorNames) {
    businessProfiles.saveCompetitors(profile.id, body.competitorNames);
  }
  if (process.env.DISABLE_ONBOARDING_PROMPT_GENERATION !== "1") {
    void generateMonitoringPrompts(profile);
  }
  return c.json(profile, 201);
});

const competitorsSchema = z.object({
  competitorNames: z.array(z.string().trim().min(1)).length(5),
});

businessRoutes.get("/business-profiles/:id/competitors", (c) => {
  if (!businessProfiles.get(c.req.param("id"))) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({ competitorNames: businessProfiles.competitors(c.req.param("id")) });
});

businessRoutes.get("/business-profiles/:id/competitive-monitoring", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const windowDays = Math.max(1, Math.min(90, Number(c.req.query("windowDays") ?? 7)));
  return c.json(buildMonitoringBenchmark(profile, Number.isFinite(windowDays) ? windowDays : 7));
});

businessRoutes.put("/business-profiles/:id/competitors", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = competitorsSchema.parse(await c.req.json());
  return c.json({ competitorNames: businessProfiles.saveCompetitors(id, body.competitorNames) });
});

const promptSchema = z.object({
  prompt: z.string().trim().min(8),
  category: z.enum(["comparison", "recommendation", "feature", "pricing", "custom"]).default("custom"),
  cadence: z.enum(["daily", "weekly"]).default("daily"),
  active: z.boolean().default(true),
});

const recommendationFeedbackSchema = z.object({
  recommendationId: z.string().trim().min(1),
  rating: z.enum(["good", "bad"]),
});

const recommendationStatusSchema = z.object({
  status: z.enum(["proposed", "planned", "in_progress", "completed", "dismissed"]),
});

businessRoutes.get("/business-profiles/:id/monitoring", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const state = monitoringPrompts.state(id);
  return c.json({
    status: state.monitoring_status,
    error: state.error,
    prompts: monitoringPrompts.list(id, true),
    history: monitoringHistory(id),
    summary: monitoringSummary(id),
  });
});

businessRoutes.post("/business-profiles/:id/monitoring/runs", async (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = await c.req.json().catch(() => ({}));
  const runSchema = z.object({
    providers: z.array(z.enum(["openai", "anthropic", "gemini"])).min(1).default(defaultMonitoringProviders),
    dueOnly: z.boolean().default(false),
  });
  const { providers, dueOnly } = runSchema.parse(body);
  const run = await runMonitoring(profile, providers, dueOnly);
  return run.status === "failed"
    ? c.json({ ...run, error: "All selected providers failed. Check API keys and provider configuration." }, 503)
    : c.json(run);
});

businessRoutes.get("/business-profiles/:id/monitoring/history", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({ history: monitoringHistory(id) });
});

businessRoutes.post("/business-profiles/:id/monitoring-prompts", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = promptSchema.parse(await c.req.json());
  const duplicate = monitoringPrompts.findDuplicate(id, body.prompt);
  if (duplicate) {
    return c.json({ error: "A near-identical prompt is already configured.", duplicate }, 409);
  }
  return c.json(monitoringPrompts.add(id, body), 201);
});

businessRoutes.put("/business-profiles/:id/monitoring-prompts/:promptId", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = promptSchema.parse(await c.req.json());
  const duplicate = monitoringPrompts.findDuplicate(id, body.prompt, c.req.param("promptId"));
  if (duplicate) {
    return c.json({ error: "A near-identical prompt is already configured.", duplicate }, 409);
  }
  const prompt = monitoringPrompts.update(id, c.req.param("promptId"), body);
  return prompt ? c.json(prompt) : c.json({ error: "Monitoring prompt not found." }, 404);
});

businessRoutes.get("/business-profiles/:id/accuracy-alerts", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const checkedIds = citationGrounding.checkedAttemptIds(id);
  for (const attempt of monitoringRuns.attempts(id)) {
    if (!checkedIds.has(attempt.id)) recordCitationGrounding(attempt);
  }
  return c.json({
    alerts: citationGrounding.alerts(id),
    summary: citationGrounding.summary(id),
    providers: citationGrounding.providerSummary(id),
  });
});

businessRoutes.put("/business-profiles/:id/accuracy-alerts/:alertId/acknowledge", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const alert = citationGrounding.acknowledge(id, c.req.param("alertId"));
  return alert ? c.json(alert) : c.json({ error: "Open alert not found." }, 404);
});

businessRoutes.get("/business-profiles/:id/recommendation-feedback", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({ feedback: recommendationFeedback.list(id) });
});

businessRoutes.get("/business-profiles/:id/recommendations", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const recommendations = syncProfileRecommendations(profile);
  return c.json({
    recommendations,
    llmConfigured: isLLMProviderConfigured("openai"),
  });
});

businessRoutes.put("/business-profiles/:id/recommendations/:recommendationId/status", async (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const { status } = recommendationStatusSchema.parse(await c.req.json());
  const recommendation = profileRecommendations.updateStatus(
    profile.id,
    c.req.param("recommendationId"),
    status,
  );
  return recommendation ? c.json(recommendation) : c.json({ error: "Recommendation not found." }, 404);
});

businessRoutes.get("/business-profiles/:id/sources", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const filterSchema = z.object({
    provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
    sourceType: z.enum(["reddit", "publication", "review", "video", "wiki", "other"]).optional(),
    sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    windowDays: z.coerce.number().int().min(1).max(90).default(7),
  });
  const sources = aggregateSources(profile, filterSchema.parse(c.req.query()));
  return c.json({
    sources,
    llmConfigured: isLLMProviderConfigured("openai"),
  });
});

businessRoutes.put("/business-profiles/:id/recommendation-feedback", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = recommendationFeedbackSchema.parse(await c.req.json());
  return c.json(recommendationFeedback.save(id, body.recommendationId, body.rating));
});

businessRoutes.get("/business-profiles/:id/admin/metrics", (c) => {
  const id = c.req.param("id");
  const profile = businessProfiles.get(id);
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const recommendationCount = syncProfileRecommendations(profile).length;
  return c.json({
    recommendationFeedback: recommendationFeedback.metrics(id, recommendationCount),
  });
});
