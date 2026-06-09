import { z } from "zod";
import { store, getNowIso } from "../../db/store";
import { callStructuredLLM } from "../../lib/llm-providers";
import type { CitedSource } from "./types";

const sourceSchema = z.object({
  sources: z.array(z.object({
    domain: z.string().min(1),
    title: z.string().min(1),
    citationsThisWeek: z.number().int().min(1),
    brandsMentioned: z.array(z.string().min(1)).min(1),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    sourceType: z.enum(["reddit", "publication", "review", "video", "wiki", "other"]),
  })).min(30).max(40),
});

function mockSources(brandName: string, competitorNames: string[]) {
  return {
    sources: Array.from({ length: 30 }, (_, index) => ({
      domain: `example-${index + 1}.com`,
      title: `${brandName} source signal ${index + 1}`,
      citationsThisWeek: 1,
      brandsMentioned: [brandName, competitorNames[index % Math.max(competitorNames.length, 1)] ?? brandName],
      sentiment: "neutral" as const,
      sourceType: (["publication", "reddit", "review", "video", "wiki"] as const)[index % 5]!,
    })),
  };
}

export async function refreshSourcesForBrand(input: {
  brandId: string;
  brandName: string;
  competitorNames: string[];
}) {
  const result = await callStructuredLLM({
    model: "gpt-4.1-mini",
    schema: sourceSchema,
    schemaName: "cited_source_list",
    useSearch: true,
    mockValue: mockSources(input.brandName, input.competitorNames),
    prompt: `Find third-party sources that AI assistants are likely to cite when answering questions about this brand and its competitors.

Brand: ${input.brandName}
Competitors: ${input.competitorNames.join(", ")}

Return 30 to 40 distinct source records spanning news/publications, Reddit/forums, reviews, YouTube/video, wikis, and other relevant source types. Prefer sources with clear domains and titles. Do not invent URLs; use domain and title only.`,
  });

  const createdAt = getNowIso();
  const existingKeys = new Set(
    store.citedSources
      .filter((source) => source.brandId === input.brandId)
      .map((source) => `${source.domain.toLowerCase()}::${source.title.toLowerCase()}`),
  );

  const sources: CitedSource[] = result.sources
    .filter((source) => !existingKeys.has(`${source.domain.toLowerCase()}::${source.title.toLowerCase()}`))
    .map((source) => ({
      id: crypto.randomUUID(),
      brandId: input.brandId,
      domain: source.domain,
      title: source.title,
      citationsThisWeek: source.citationsThisWeek,
      brandsMentioned: source.brandsMentioned,
      sentiment: source.sentiment,
      sourceType: source.sourceType,
      createdAt,
    }));

  store.citedSources.push(...sources);
  return sources;
}

export function sourcesForBrand(brandId: string) {
  return store.citedSources
    .filter((source) => source.brandId === brandId)
    .sort((a, b) => b.citationsThisWeek - a.citationsThisWeek || a.title.localeCompare(b.title));
}
