import { Hono } from "hono";
import { z } from "zod";
import { seedPromptSetId, store } from "../db/store";
import { buildCompetitiveOverview, buildCompetitiveTrends } from "../features/competitive/benchmark.service";
import { parseCohortRun, runCompetitivePipeline } from "../features/competitive/pipeline";
import {
  publishCompetitiveProgress,
  subscribeToCompetitiveProgress,
} from "../features/competitive/progress";
import { runGapAnalysis } from "../features/competitive/gap-analysis.service";
import { refreshSourcesForBrand } from "../features/competitive/sources.service";
import { publishGapEventsToRecommendationInputs } from "../features/fixit/signal-bridge";
import { persistGapEventsToProfileRecommendations } from "../features/fixit/profile-recommendations";
import { benchmarkSnapshots, type BenchmarkCitation } from "../db/benchmark-snapshots";

const competitorSetSchema = z.object({
  accountBrandName: z.string().min(1),
  competitorNames: z.array(z.string().min(1)).length(5),
  businessProfileId: z.string().min(1).optional(),
});

const competitiveRunSchema = z.object({
  accountBrandId: z.string().min(1),
  competitorBrandIds: z.array(z.string().min(1)).length(5),
  promptSetId: z.string().optional(),
  sessionId: z.string().min(1).optional(),
  businessProfileId: z.string().min(1).optional(),
  provider: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  models: z.array(z.string().min(1)).min(1).default(["gpt-4.1-mini"]),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
});

function benchmarkProviderConfigured(provider: "openai" | "anthropic" | "gemini") {
  if (
    process.env.PERCEPTION_FORCE_MOCK_LLM === "1" ||
    process.env.NODE_ENV === "test" ||
    process.env.BUN_ENV === "test"
  ) {
    return true;
  }
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY);
}

function ensureBrand(name: string) {
  const existing = Array.from(store.brands.values()).find((brand) => brand.name === name);
  if (existing) {
    return existing;
  }
  const brand = { id: crypto.randomUUID(), name };
  store.brands.set(brand.id, brand);
  return brand;
}

function ensureAccountBrand(name: string, businessProfileId?: string) {
  if (!businessProfileId) {
    return ensureBrand(name);
  }

  const existingId = store.businessProfileBrandIds.get(businessProfileId);
  const existing = existingId ? store.brands.get(existingId) : null;
  if (existing) {
    existing.name = name;
    return existing;
  }

  const brand = { id: crypto.randomUUID(), name };
  store.brands.set(brand.id, brand);
  store.businessProfileBrandIds.set(businessProfileId, brand.id);
  return brand;
}

/**
 * Flattens the citations the judge LLM attached to comparative scoring runs.
 * When `promptRunIds` is provided, only citations from those runs are returned
 * (used to snapshot a single benchmark run). Most recent runs first.
 */
function flattenBenchmarkCitations(promptRunIds?: Set<string>): BenchmarkCitation[] {
  const brandName = (brandId?: string) => (brandId ? store.brands.get(brandId)?.name ?? null : null);
  return [...store.comparisons]
    .reverse()
    .filter((comparison) => !promptRunIds || promptRunIds.has(comparison.promptRunId))
    .flatMap((comparison) => {
      const promptRun = store.promptRuns.get(comparison.promptRunId);
      return (comparison.citations ?? []).map((citation) => ({
        url: citation.url,
        claim: citation.claim,
        brandId: citation.brandId ?? null,
        brandName: brandName(citation.brandId),
        prompt: promptRun?.prompt ?? null,
        promptKind: promptRun?.promptKind ?? null,
        promptRunId: comparison.promptRunId,
      }));
    });
}

export const competitiveRoutes = new Hono();

competitiveRoutes.get("/competitive/stream/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const encoder = new TextEncoder();

  const sendEvent = (controller: ReadableStreamDefaultController<Uint8Array>, payload: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      sendEvent(controller, { type: "connected", message: "Progress stream connected.", ts: new Date().toISOString() });
      const unsubscribe = subscribeToCompetitiveProgress(sessionId, (event) => {
        sendEvent(controller, event);
      });
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);
      const cleanup = () => {
        clearInterval(interval);
        unsubscribe();
      };
      c.req.raw.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      /* cleanup is handled via abort */
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

competitiveRoutes.post("/competitive-sets", async (c) => {
  const body = competitorSetSchema.parse(await c.req.json());
  const accountBrand = ensureAccountBrand(body.accountBrandName, body.businessProfileId);
  const competitors = body.competitorNames.map(ensureBrand);
  const competitorSet = {
    id: crypto.randomUUID(),
    accountBrandId: accountBrand.id,
    competitorBrandIds: [
      competitors[0]!.id,
      competitors[1]!.id,
      competitors[2]!.id,
      competitors[3]!.id,
      competitors[4]!.id,
    ] as [string, string, string, string, string],
    createdAt: new Date().toISOString(),
  };
  store.competitorSets.set(competitorSet.id, competitorSet);
  return c.json(competitorSet, 201);
});

competitiveRoutes.post("/competitive/runs", async (c) => {
  const body = competitiveRunSchema.parse(await c.req.json());
  if (
    !benchmarkProviderConfigured(body.provider)
  ) {
    return c.json({
      error: `${body.provider} is not configured. Set the provider API key to run a live benchmark.`,
    }, 503);
  }
  const reportProgress = body.sessionId
    ? (event: Parameters<typeof publishCompetitiveProgress>[1]) => publishCompetitiveProgress(body.sessionId!, event)
    : undefined;
  const runInput = parseCohortRun({
    ...body,
    promptSetId: body.promptSetId ?? seedPromptSetId,
  });
  try {
    reportProgress?.({ type: "run_started", message: "Benchmark run started." });
    const result = await runCompetitivePipeline(runInput, { reportProgress });
    const gapEvents = runGapAnalysis({
      accountBrandId: runInput.accountBrandId,
      promptRunIds: result.promptRuns.map((run) => run.id),
    });
    const { recommendationInputs, recommendations } = publishGapEventsToRecommendationInputs(gapEvents);

    // Bridge the in-memory benchmark gaps into the SQLite profile_recommendations
    // table so the Recommendations page (which reads SQLite) reflects this run.
    const businessProfileId = body.businessProfileId
      ?? Array.from(store.businessProfileBrandIds.entries()).find(
        ([, brandId]) => brandId === runInput.accountBrandId,
      )?.[0];
    let persistedRecommendationCount = 0;
    if (businessProfileId) {
      const brandLabels: Record<string, string> = {};
      for (const brandId of [runInput.accountBrandId, ...runInput.competitorBrandIds]) {
        const name = store.brands.get(brandId)?.name;
        if (name) brandLabels[brandId] = name;
      }
      persistedRecommendationCount = persistGapEventsToProfileRecommendations(
        businessProfileId,
        gapEvents,
        brandLabels,
      ).length;
    }

    const accountBrand = store.brands.get(runInput.accountBrandId);
    const competitorNames = runInput.competitorBrandIds
      .map((brandId) => store.brands.get(brandId)?.name)
      .filter((name): name is string => Boolean(name));
    const sources = accountBrand
      ? await refreshSourcesForBrand({
        brandId: accountBrand.id,
        brandName: accountBrand.name,
        competitorNames,
      })
      : [];

    // Persist the full benchmark snapshot to SQLite so the Benchmarking and
    // Accuracy tabs survive a server restart (the in-memory store does not).
    let persistedSnapshot = false;
    if (businessProfileId) {
      const brandLabels: Record<string, string> = {};
      for (const brandId of [runInput.accountBrandId, ...runInput.competitorBrandIds]) {
        const name = store.brands.get(brandId)?.name;
        if (name) brandLabels[brandId] = name;
      }
      const promptRunIds = new Set(result.promptRuns.map((run) => run.id));
      benchmarkSnapshots.upsert({
        businessProfileId,
        snapshot: {
          timeframe: { start: body.windowStart, end: body.windowEnd },
          brandLabels,
          accountBrandId: runInput.accountBrandId,
          accountBrandName: accountBrand?.name ?? null,
          competitorBrandIds: [...runInput.competitorBrandIds],
          overview: buildCompetitiveOverview({ windowStart: body.windowStart, windowEnd: body.windowEnd }),
          trends: buildCompetitiveTrends({ windowStart: body.windowStart, windowEnd: body.windowEnd }),
          gaps: store.gapEvents.filter((event) => event.brandId === runInput.accountBrandId),
        },
        citations: flattenBenchmarkCitations(promptRunIds),
        sources,
      });
      persistedSnapshot = true;
    }

    reportProgress?.({ type: "run_completed", message: "Benchmark run completed." });

    return c.json({
      promptRuns: result.promptRuns,
      answerCount: result.answers.length,
      comparisons: result.comparisons,
      gapEvents,
      recommendationInputsCount: recommendationInputs.length,
      recommendationCount: recommendations.length,
      persistedRecommendationCount,
      persistedSnapshot,
      sourceCount: sources.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Benchmark run failed.";
    reportProgress?.({ type: "run_failed", message });
    return c.json({ error: message }, 500);
  }
});

competitiveRoutes.get("/competitive/overview", (c) => {
  const windowStart = c.req.query("windowStart");
  const windowEnd = c.req.query("windowEnd");
  if (!windowStart || !windowEnd) {
    return c.json({ error: "windowStart and windowEnd are required ISO datetimes." }, 400);
  }
  return c.json(buildCompetitiveOverview({ windowStart, windowEnd }));
});

competitiveRoutes.get("/competitive/trends", (c) => {
  const windowStart = c.req.query("windowStart");
  const windowEnd = c.req.query("windowEnd");
  if (!windowStart || !windowEnd) {
    return c.json({ error: "windowStart and windowEnd are required ISO datetimes." }, 400);
  }
  return c.json(buildCompetitiveTrends({ windowStart, windowEnd }));
});

/**
 * Flattens the citations the judge LLM attached to every comparative scoring
 * run so the Citation Grounding view can show the sources behind benchmark
 * results. Most recent runs first.
 */
competitiveRoutes.get("/competitive/citations", (c) => {
  const citations = flattenBenchmarkCitations();

  return c.json({
    citations,
    summary: {
      totalCitations: citations.length,
      judgedResponses: store.comparisons.length,
      minimumPerResponse: 25,
    },
  });
});

competitiveRoutes.get("/competitive/gaps", (c) => {
  const accountBrandId = c.req.query("accountBrandId");
  if (!accountBrandId) {
    return c.json({ error: "accountBrandId is required." }, 400);
  }
  const gaps = store.gapEvents.filter((event) => event.brandId === accountBrandId);
  return c.json({ count: gaps.length, gaps });
});

/**
 * One-shot dashboard snapshot for first-paint preview. Picks the most recent
 * competitor set in the store, resolves brand id → name labels, and returns
 * overview + trends + gaps for the trailing windowDays (default 7) so the UI
 * can hydrate seeded data on mount without a Run click.
 */
competitiveRoutes.get("/competitive/snapshot", (c) => {
  const windowDays = Number(c.req.query("windowDays") ?? 7);
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date().toISOString();

  const sets = Array.from(store.competitorSets.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
  const set = sets[0];
  if (!set) {
    return c.json({
      hasData: false,
      timeframe: { start: windowStart, end: windowEnd },
      brandLabels: {},
      overview: { rows: [] },
      trends: { seriesByBrand: {} },
      gaps: [],
      accountBrandId: null,
      accountBrandName: null,
    });
  }

  const brandIds = [set.accountBrandId, ...set.competitorBrandIds];
  const brandLabels: Record<string, string> = {};
  for (const id of brandIds) {
    const brand = store.brands.get(id);
    if (brand) brandLabels[id] = brand.name;
  }
  const accountBrand = store.brands.get(set.accountBrandId);

  const overview = buildCompetitiveOverview({ windowStart, windowEnd });
  const trends = buildCompetitiveTrends({ windowStart, windowEnd });
  const gaps = store.gapEvents.filter((event) => event.brandId === set.accountBrandId);

  return c.json({
    hasData: overview.rows.length > 0,
    timeframe: { start: windowStart, end: windowEnd },
    brandLabels,
    overview,
    trends,
    gaps,
    accountBrandId: set.accountBrandId,
    accountBrandName: accountBrand?.name ?? null,
    competitorBrandIds: set.competitorBrandIds,
  });
});
