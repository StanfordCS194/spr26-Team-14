import { Hono } from "hono";
import { z } from "zod";
import { businessProfiles } from "../db/business-profiles";
import { monitoringPrompts } from "../db/monitoring-prompts";
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
import { isLLMProviderConfigured } from "../lib/llm-providers";

const profileSchema = z.object({
  name: z.string().trim().min(1),
  website: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const businessRoutes = new Hono();

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
    prompts: monitoringPrompts.list(id),
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
  });
  const { providers } = runSchema.parse(body);
  const run = await runMonitoring(profile, providers);
  return c.json(run);
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
  return c.json(monitoringPrompts.add(id, body.prompt), 201);
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
  const recommendationCount = profileRecommendations.list(profile.id).length;
  return c.json({
    recommendationFeedback: recommendationFeedback.metrics(id, recommendationCount),
  });
});
