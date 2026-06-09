import { Hono } from "hono";
import { z } from "zod";
import { accuracyGuard } from "../db/accuracy-guard";
import { businessProfiles } from "../db/business-profiles";
import { monitoringPrompts } from "../db/monitoring-prompts";
import { recommendationFeedback } from "../db/recommendation-feedback";
import { store } from "../db/store";
import { sourcesForBrand } from "../features/competitive/sources.service";
import { recommendationsForBrand } from "../features/fixit/recommendations";
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

function brandIdForProfile(profileId: string) {
  const brandId = store.businessProfileBrandIds.get(profileId);
  return brandId && store.brands.has(brandId) ? brandId : null;
}

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

const factSchema = z.object({
  category: z.enum(["pricing", "feature", "executive", "company", "custom"]),
  label: z.string().trim().min(2),
  value: z.string().trim().min(1),
});

const factUpdateSchema = factSchema.extend({
  active: z.boolean(),
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

businessRoutes.get("/business-profiles/:id/facts", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({ facts: accuracyGuard.facts(id) });
});

businessRoutes.post("/business-profiles/:id/facts", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json(accuracyGuard.createFact(id, factSchema.parse(await c.req.json())), 201);
});

businessRoutes.put("/business-profiles/:id/facts/:factId", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const fact = accuracyGuard.updateFact(id, c.req.param("factId"), factUpdateSchema.parse(await c.req.json()));
  return fact ? c.json(fact) : c.json({ error: "Fact not found." }, 404);
});

businessRoutes.delete("/business-profiles/:id/facts/:factId", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  accuracyGuard.deleteFact(id, c.req.param("factId"));
  return c.body(null, 204);
});

businessRoutes.get("/business-profiles/:id/accuracy-alerts", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({
    alerts: accuracyGuard.alerts(id),
    delivery: {
      inApp: true,
      emailConfigured: Boolean(process.env.ACCURACY_ALERT_EMAIL_WEBHOOK),
      slackConfigured: Boolean(process.env.ACCURACY_ALERT_SLACK_WEBHOOK),
    },
  });
});

businessRoutes.put("/business-profiles/:id/accuracy-alerts/:alertId/acknowledge", (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const alert = accuracyGuard.acknowledge(id, c.req.param("alertId"));
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
  const brandId = brandIdForProfile(profile.id);
  const recommendations = brandId ? recommendationsForBrand(brandId) : [];
  return c.json({
    recommendations,
    llmConfigured: isLLMProviderConfigured("openai"),
  });
});

businessRoutes.get("/business-profiles/:id/sources", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  if (!profile) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const brandId = brandIdForProfile(profile.id);
  const sources = brandId ? sourcesForBrand(brandId) : [];
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
  const brandId = brandIdForProfile(profile.id);
  const recommendationCount = brandId ? recommendationsForBrand(brandId).length : 0;
  return c.json({
    recommendationFeedback: recommendationFeedback.metrics(id, recommendationCount),
  });
});
