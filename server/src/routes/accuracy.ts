import { Hono } from "hono";
import { z } from "zod";
import { store } from "../db/store";
import { detectAccuracyFlags } from "../features/accuracy/detector";
import type { FactSheet } from "../features/accuracy/types";

const factSheetSchema = z.object({
  brandId: z.string().min(1),
  pricing: z.string().optional(),
  foundedYear: z.number().int().min(1500).max(2100).optional(),
  headquarters: z.string().optional(),
  keyFeatures: z.array(z.string().min(1)).default([]),
  executives: z.array(z.string().min(1)).default([]),
});

const runSchema = z.object({
  brandId: z.string().min(1),
});

export const accuracyRoutes = new Hono();

accuracyRoutes.post("/accuracy/fact-sheet", async (c) => {
  const body = factSheetSchema.parse(await c.req.json());
  if (!store.brands.has(body.brandId)) {
    return c.json({ error: "Unknown brandId." }, 404);
  }
  const factSheet: FactSheet = {
    id: crypto.randomUUID(),
    brandId: body.brandId,
    pricing: body.pricing,
    foundedYear: body.foundedYear,
    headquarters: body.headquarters,
    keyFeatures: body.keyFeatures,
    executives: body.executives,
    createdAt: new Date().toISOString(),
  };
  store.factSheets.set(body.brandId, factSheet);
  return c.json(factSheet, 201);
});

accuracyRoutes.post("/accuracy/runs", async (c) => {
  const body = runSchema.parse(await c.req.json());
  const factSheet = store.factSheets.get(body.brandId);
  if (!factSheet) {
    return c.json({ error: "No fact sheet registered for this brand." }, 404);
  }
  const answers = Array.from(store.answers.values()).filter((answer) => answer.brandId === body.brandId);
  const flags = detectAccuracyFlags({ factSheet, answers });
  store.accuracyFlags.push(...flags);
  return c.json({ scannedAnswers: answers.length, flagged: flags.length, flags });
});

accuracyRoutes.get("/accuracy/flags", (c) => {
  const brandId = c.req.query("brandId");
  if (!brandId) {
    return c.json({ error: "brandId is required." }, 400);
  }
  const flags = store.accuracyFlags.filter((flag) => flag.brandId === brandId);
  return c.json({ count: flags.length, flags });
});
