import type {
  AIAnswer,
  Brand,
  ComparativeDelta,
  CompetitorSet,
  GapEvent,
  PromptRun,
  PromptSet,
} from "../features/competitive/types";

const nowIso = () => new Date().toISOString();

const seededPromptSet: PromptSet = {
  id: crypto.randomUUID(),
  name: "Competitive brand perception — 10 brand + 10 domain questions (generic)",
  brandSpecificPrompts: [
    "How is {brand} generally perceived on trustworthiness and delivering on what it promises?",
    "How do buyers typically view {brand}'s quality and consistency compared with alternatives in the same space?",
    "How is {brand}'s customer experience (support, ease of purchase or use, and issue resolution) perceived?",
    "How is {brand}'s pace of innovation and improvement seen relative to peers?",
    "How is {brand}'s value for money perceived—premium, fairly priced, or expensive for what you get?",
    "How strong is {brand}'s reputation for reliability when outcomes matter (dependability, consistency, repeat performance)?",
    "How is {brand} perceived on transparency, honest marketing, and clear communication?",
    "How does {brand} rate on meeting both mainstream needs and more specialized or demanding segments?",
    "How is {brand}'s ethics, governance, and social responsibility perceived relative to competitors?",
    "How emotionally loyal or attached do customers tend to feel toward {brand}?",
  ],
  domainPrompts: [
    "In this category, who is most often described as the leader or reference standard that others are compared against?",
    "Who is widely seen as the most reliable choice when the stakes are high or mistakes are costly?",
    "Who is generally considered the best overall pick for a typical buyer in this market?",
    "Which player is most associated with the best value—quality relative to price?",
    "Who is seen as the most innovative or future-oriented in this space?",
    "Who enjoys the strongest trust and credibility with customers in this category?",
    "Who is perceived as offering the strongest end-to-end customer experience?",
    "Which brand is most associated with premium quality, status, or exclusivity?",
    "Which brand is most associated with accessibility, everyday value, or serving mainstream needs?",
    "Who is most often described as gaining ground versus those seen as losing relevance in this category?",
  ],
  createdAt: nowIso(),
};

export const store = {
  brands: new Map<string, Brand>(),
  competitorSets: new Map<string, CompetitorSet>(),
  promptSets: new Map<string, PromptSet>([[seededPromptSet.id, seededPromptSet]]),
  promptRuns: new Map<string, PromptRun>(),
  answers: new Map<string, AIAnswer>(),
  comparisons: [] as ComparativeDelta[],
  gapEvents: [] as GapEvent[],
  benchmarkSnapshots: [] as Array<{
    id: string;
    accountBrandId: string;
    competitorSetId: string;
    windowStart: string;
    windowEnd: string;
    createdAt: string;
    metrics: Record<string, unknown>;
  }>,
  recommendationInputs: [] as Array<{
    id: string;
    sourceGapEventId: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>,
};

export const seedPromptSetId = seededPromptSet.id;

export const getNowIso = nowIso;

export function resetStore() {
  store.brands.clear();
  store.competitorSets.clear();
  store.promptRuns.clear();
  store.answers.clear();
  store.comparisons.length = 0;
  store.gapEvents.length = 0;
  store.benchmarkSnapshots.length = 0;
  store.recommendationInputs.length = 0;
}
