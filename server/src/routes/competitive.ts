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
import { publishGapEventsToRecommendationInputs } from "../features/fixit/signal-bridge";

const competitorSetSchema = z.object({
  accountBrandName: z.string().min(1),
  competitorNames: z.array(z.string().min(1)).length(5),
});

const competitiveRunSchema = z.object({
  accountBrandId: z.string().min(1),
  competitorBrandIds: z.array(z.string().min(1)).length(5),
  promptSetId: z.string().optional(),
  sessionId: z.string().min(1).optional(),
  models: z.array(z.string().min(1)).min(1).default(["gpt-4.1-mini"]),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
});

function ensureBrand(name: string) {
  const existing = Array.from(store.brands.values()).find((brand) => brand.name === name);
  if (existing) {
    return existing;
  }
  const brand = { id: crypto.randomUUID(), name };
  store.brands.set(brand.id, brand);
  return brand;
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
  const accountBrand = ensureBrand(body.accountBrandName);
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
    const recommendationInputs = publishGapEventsToRecommendationInputs(gapEvents);
    reportProgress?.({ type: "run_completed", message: "Benchmark run completed." });

    return c.json({
      promptRuns: result.promptRuns,
      answerCount: result.answers.length,
      comparisons: result.comparisons,
      gapEvents,
      recommendationInputsCount: recommendationInputs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Benchmark run failed.";
    reportProgress?.({ type: "run_failed", message });
    throw error;
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

competitiveRoutes.get("/competitive/gaps", (c) => {
  const accountBrandId = c.req.query("accountBrandId");
  if (!accountBrandId) {
    return c.json({ error: "accountBrandId is required." }, 400);
  }
  const gaps = store.gapEvents.filter((event) => event.brandId === accountBrandId);
  return c.json({ count: gaps.length, gaps });
});
