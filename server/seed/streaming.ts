import { seedPromptSetId, store } from "../src/db/store";
import type {
  Brand,
  ComparativeDelta,
  CompetitorSet,
  GapEvent,
  PromptRun,
} from "../src/features/competitive/types";

/**
 * Demo seed: a recognizable streaming-services competitive cohort with 7 days
 * of synthetic benchmark history. Netflix is the account brand vs Disney+,
 * Max, Amazon Prime Video, Apple TV+, and Paramount+. The synthetic story
 * arc: Netflix dominates "leader / best overall" but loses ground on "value"
 * (Amazon Prime bundle) and "innovation" (Apple TV+ originals).
 *
 * Loads brands, a competitor set, prompt runs across the last week, one
 * comparison + a couple of gap events per run. We deliberately skip seeding
 * `AIAnswer` rows: the dashboard reads only prompt runs, comparisons, and
 * gap events.
 */

const ACCOUNT_BRAND_NAME = "Netflix";
const COMPETITOR_NAMES = ["Disney+", "Max", "Amazon Prime Video", "Apple TV+", "Paramount+"] as const;
const MODEL = "gpt-4.1-mini";

interface ScriptedComparison {
  hoursAgo: number;
  prompt: string;
  promptKind: "brand_specific" | "domain_general";
  shareByName: Record<string, number>;
  sentimentByName: Record<string, number>;
  praisedByName: Record<string, string[]>;
  evidence: string[];
}

const SCRIPTED_COMPARISONS: ScriptedComparison[] = [
  {
    hoursAgo: 6 * 24,
    prompt: "Who is most often described as the leader or reference standard in streaming?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.38,
      "Disney+": 0.21,
      "Max": 0.13,
      "Amazon Prime Video": 0.12,
      "Apple TV+": 0.09,
      "Paramount+": 0.07,
    },
    sentimentByName: {
      "Netflix": 0.6,
      "Disney+": 0.45,
      "Max": 0.4,
      "Amazon Prime Video": 0.3,
      "Apple TV+": 0.45,
      "Paramount+": 0.1,
    },
    praisedByName: {
      "Netflix": ["leadership", "content_volume", "originals"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige", "content_quality"],
      "Amazon Prime Video": ["bundle", "value"],
      "Apple TV+": ["originals", "quality"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Netflix consistently framed as the streaming category reference standard.",
      "Disney+ trails as a strong second on the back of Marvel / Star Wars / Pixar.",
      "Paramount+ rarely surfaces unless live sports comes up.",
    ],
  },
  {
    hoursAgo: 5 * 24,
    prompt: "How is {brand} generally perceived on trustworthiness and delivering on what it promises?",
    promptKind: "brand_specific",
    shareByName: {
      "Netflix": 0.3,
      "Disney+": 0.22,
      "Max": 0.16,
      "Amazon Prime Video": 0.12,
      "Apple TV+": 0.13,
      "Paramount+": 0.07,
    },
    sentimentByName: {
      "Netflix": 0.55,
      "Disney+": 0.5,
      "Max": 0.45,
      "Amazon Prime Video": 0.35,
      "Apple TV+": 0.55,
      "Paramount+": 0.05,
    },
    praisedByName: {
      "Netflix": ["reliability", "originals"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["quality"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Netflix trust narrative dominates — buyers expect titles to ship and queues to work.",
      "Apple TV+ over-indexes on trust given small library — quality reputation.",
      "Paramount+ trust narrative weaker; framed as scrappy and inconsistent.",
    ],
  },
  {
    hoursAgo: 4 * 24,
    prompt: "Which player is most associated with the best value—quality relative to price?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.13,
      "Disney+": 0.18,
      "Max": 0.07,
      "Amazon Prime Video": 0.34,
      "Apple TV+": 0.06,
      "Paramount+": 0.22,
    },
    sentimentByName: {
      "Netflix": 0.05,
      "Disney+": 0.4,
      "Max": 0.0,
      "Amazon Prime Video": 0.6,
      "Apple TV+": -0.05,
      "Paramount+": 0.5,
    },
    praisedByName: {
      "Netflix": ["originals"],
      "Disney+": ["family", "ip", "bundle"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["value", "bundle", "sports"],
      "Apple TV+": ["quality"],
      "Paramount+": ["value", "sports"],
    },
    evidence: [
      "Amazon Prime owns 'value' framing because it's bundled with Prime shipping.",
      "Netflix sentiment near-neutral — repeatedly tagged as 'expensive lately'.",
      "Paramount+ undercuts on price; surfaces alongside Prime in value answers.",
    ],
  },
  {
    hoursAgo: 3 * 24,
    prompt: "Who is seen as the most innovative or future-oriented in this space?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.2,
      "Disney+": 0.12,
      "Max": 0.1,
      "Amazon Prime Video": 0.1,
      "Apple TV+": 0.36,
      "Paramount+": 0.12,
    },
    sentimentByName: {
      "Netflix": 0.35,
      "Disney+": 0.25,
      "Max": 0.2,
      "Amazon Prime Video": 0.2,
      "Apple TV+": 0.65,
      "Paramount+": 0.1,
    },
    praisedByName: {
      "Netflix": ["originals", "recommendations"],
      "Disney+": ["family"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["innovation", "quality", "originals"],
      "Paramount+": ["scrappy"],
    },
    evidence: [
      "Apple TV+ owns the innovation narrative via prestige originals like Severance and Ted Lasso.",
      "Netflix innovation share lags expected scale — viewed as 'incumbent' rather than 'forward'.",
      "Paramount+ rarely cited in forward-looking answers.",
    ],
  },
  {
    hoursAgo: 2 * 24,
    prompt: "How is {brand}'s customer experience perceived?",
    promptKind: "brand_specific",
    shareByName: {
      "Netflix": 0.32,
      "Disney+": 0.24,
      "Max": 0.13,
      "Amazon Prime Video": 0.16,
      "Apple TV+": 0.1,
      "Paramount+": 0.05,
    },
    sentimentByName: {
      "Netflix": 0.55,
      "Disney+": 0.55,
      "Max": 0.4,
      "Amazon Prime Video": 0.35,
      "Apple TV+": 0.5,
      "Paramount+": 0.05,
    },
    praisedByName: {
      "Netflix": ["recommendations", "reliability"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["quality"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Netflix and Disney+ tied on UX polish; Disney+ wins for family flows.",
      "Amazon Prime UX inconsistent — buy-vs-rent confusion surfaces repeatedly.",
      "Paramount+ framed as transactional and ad-heavy.",
    ],
  },
  {
    hoursAgo: 1 * 24,
    prompt: "Which brand is most associated with premium quality, status, or exclusivity?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.18,
      "Disney+": 0.14,
      "Max": 0.32,
      "Amazon Prime Video": 0.05,
      "Apple TV+": 0.27,
      "Paramount+": 0.04,
    },
    sentimentByName: {
      "Netflix": 0.35,
      "Disney+": 0.4,
      "Max": 0.6,
      "Amazon Prime Video": 0.0,
      "Apple TV+": 0.6,
      "Paramount+": -0.05,
    },
    praisedByName: {
      "Netflix": ["originals"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige", "content_quality"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["quality", "originals"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Max and Apple TV+ split the premium narrative: HBO heritage vs Apple polish.",
      "Amazon Prime firmly outside the prestige tier despite its scale.",
      "Paramount+ seldom present in premium conversations.",
    ],
  },
  {
    hoursAgo: 12,
    prompt: "How is {brand}'s value for money perceived?",
    promptKind: "brand_specific",
    shareByName: {
      "Netflix": 0.14,
      "Disney+": 0.18,
      "Max": 0.07,
      "Amazon Prime Video": 0.32,
      "Apple TV+": 0.08,
      "Paramount+": 0.21,
    },
    sentimentByName: {
      "Netflix": 0.05,
      "Disney+": 0.45,
      "Max": -0.05,
      "Amazon Prime Video": 0.6,
      "Apple TV+": -0.05,
      "Paramount+": 0.5,
    },
    praisedByName: {
      "Netflix": ["originals"],
      "Disney+": ["family", "bundle"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["value", "bundle"],
      "Apple TV+": ["quality"],
      "Paramount+": ["value", "sports"],
    },
    evidence: [
      "Amazon Prime retains value ownership week over week thanks to the Prime bundle.",
      "Netflix value sentiment near-neutral — ad-tier helps but pricing fatigue persists.",
      "Apple TV+ called out as 'expensive for what you get' on small library.",
    ],
  },
  {
    hoursAgo: 6,
    prompt: "Who is widely seen as the most reliable choice when the stakes are high?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.34,
      "Disney+": 0.23,
      "Max": 0.16,
      "Amazon Prime Video": 0.13,
      "Apple TV+": 0.08,
      "Paramount+": 0.06,
    },
    sentimentByName: {
      "Netflix": 0.6,
      "Disney+": 0.5,
      "Max": 0.5,
      "Amazon Prime Video": 0.35,
      "Apple TV+": 0.45,
      "Paramount+": 0.05,
    },
    praisedByName: {
      "Netflix": ["reliability", "leadership", "originals"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["quality"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Netflix reliability narrative strongest for 'I just want something to work'.",
      "Disney+ reliable for family viewing; Paramount+ rarely cited as a high-stakes pick.",
      "Apple TV+ reliable but constrained by smaller library footprint.",
    ],
  },
  {
    hoursAgo: 3,
    prompt: "How is {brand}'s pace of innovation seen relative to peers?",
    promptKind: "brand_specific",
    shareByName: {
      "Netflix": 0.21,
      "Disney+": 0.13,
      "Max": 0.1,
      "Amazon Prime Video": 0.1,
      "Apple TV+": 0.37,
      "Paramount+": 0.09,
    },
    sentimentByName: {
      "Netflix": 0.3,
      "Disney+": 0.25,
      "Max": 0.2,
      "Amazon Prime Video": 0.15,
      "Apple TV+": 0.65,
      "Paramount+": 0.0,
    },
    praisedByName: {
      "Netflix": ["originals", "recommendations"],
      "Disney+": ["family"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle"],
      "Apple TV+": ["innovation", "quality", "originals"],
      "Paramount+": ["scrappy"],
    },
    evidence: [
      "Apple TV+ extends innovation lead week over week with prestige originals.",
      "Netflix innovation share lags expected scale; framed as 'mature' not 'next'.",
      "Paramount+ registers a flat-to-negative innovation sentiment.",
    ],
  },
  {
    hoursAgo: 1,
    prompt: "Who is most often described as gaining ground versus those losing relevance?",
    promptKind: "domain_general",
    shareByName: {
      "Netflix": 0.26,
      "Disney+": 0.16,
      "Max": 0.13,
      "Amazon Prime Video": 0.16,
      "Apple TV+": 0.21,
      "Paramount+": 0.08,
    },
    sentimentByName: {
      "Netflix": 0.45,
      "Disney+": 0.3,
      "Max": 0.3,
      "Amazon Prime Video": 0.35,
      "Apple TV+": 0.6,
      "Paramount+": 0.05,
    },
    praisedByName: {
      "Netflix": ["leadership", "originals"],
      "Disney+": ["family", "ip"],
      "Max": ["prestige"],
      "Amazon Prime Video": ["bundle", "value"],
      "Apple TV+": ["innovation", "quality"],
      "Paramount+": ["sports"],
    },
    evidence: [
      "Apple TV+ rising fastest; Netflix holding steady at the top of the chart.",
      "Paramount+ consistently framed as fighting for relevance.",
      "Disney+ and Max trade incremental ground week to week.",
    ],
  },
];

function ensureBrand(name: string): Brand {
  for (const existing of store.brands.values()) {
    if (existing.name === name) {
      return existing;
    }
  }
  const brand: Brand = { id: crypto.randomUUID(), name };
  store.brands.set(brand.id, brand);
  return brand;
}

function ensureCompetitorSet(accountBrand: Brand, competitors: Brand[]): CompetitorSet {
  for (const set of store.competitorSets.values()) {
    if (set.accountBrandId === accountBrand.id) {
      return set;
    }
  }
  if (competitors.length !== 5) {
    throw new Error("Demo seed expects exactly five competitors.");
  }
  const set: CompetitorSet = {
    id: crypto.randomUUID(),
    accountBrandId: accountBrand.id,
    competitorBrandIds: [
      competitors[0]!.id,
      competitors[1]!.id,
      competitors[2]!.id,
      competitors[3]!.id,
      competitors[4]!.id,
    ],
    createdAt: new Date().toISOString(),
  };
  store.competitorSets.set(set.id, set);
  return set;
}

function remapByBrandId(map: Record<string, number | string[]>, byName: Record<string, Brand>) {
  const result: Record<string, number | string[]> = {};
  for (const [name, value] of Object.entries(map)) {
    const brand = byName[name];
    if (brand) {
      result[brand.id] = value;
    }
  }
  return result;
}

function buildGapEvents(brandsByName: Record<string, Brand>, promptRunsByIndex: PromptRun[]): GapEvent[] {
  const netflix = brandsByName["Netflix"]!;
  const amazon = brandsByName["Amazon Prime Video"]!;
  const apple = brandsByName["Apple TV+"]!;

  return [
    {
      id: crypto.randomUUID(),
      gapType: "feature_praise_gap",
      brandId: netflix.id,
      competitorBrandId: amazon.id,
      promptRunId: promptRunsByIndex[2]!.id,
      featureKey: "value",
      evidence: ["Amazon Prime is repeatedly praised on value via the Prime bundle; Netflix is unmentioned."],
      confidence: 0.78,
      detectedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      gapType: "feature_praise_gap",
      brandId: netflix.id,
      competitorBrandId: apple.id,
      promptRunId: promptRunsByIndex[3]!.id,
      featureKey: "innovation",
      evidence: ["Apple TV+ owns the innovation narrative via prestige originals; Netflix barely mentioned."],
      confidence: 0.71,
      detectedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      gapType: "whitespace",
      brandId: netflix.id,
      promptRunId: promptRunsByIndex[6]!.id,
      categoryKey: "live_sports",
      evidence: [
        "Live-sports prompts surface Amazon Prime Video and Paramount+; Netflix absent from the consensus answer.",
      ],
      confidence: 0.66,
      detectedAt: new Date().toISOString(),
    },
  ];
}

export interface DemoSeedSummary {
  accountBrandId: string;
  competitorBrandIds: string[];
  promptRunCount: number;
  comparisonCount: number;
  gapEventCount: number;
}

export function loadStreamingSeed(): DemoSeedSummary {
  const accountBrand = ensureBrand(ACCOUNT_BRAND_NAME);
  const competitorBrands = COMPETITOR_NAMES.map((name) => ensureBrand(name));
  ensureCompetitorSet(accountBrand, competitorBrands);

  const brandsByName: Record<string, Brand> = { [accountBrand.name]: accountBrand };
  for (const brand of competitorBrands) {
    brandsByName[brand.name] = brand;
  }

  const now = Date.now();
  const promptRuns: PromptRun[] = [];
  const comparisons: ComparativeDelta[] = [];

  for (const scripted of SCRIPTED_COMPARISONS) {
    const createdAt = new Date(now - scripted.hoursAgo * 60 * 60 * 1000).toISOString();
    const run: PromptRun = {
      id: crypto.randomUUID(),
      promptSetId: seedPromptSetId,
      prompt: scripted.prompt,
      promptKind: scripted.promptKind,
      model: MODEL,
      createdAt,
    };
    store.promptRuns.set(run.id, run);
    promptRuns.push(run);

    const comparison: ComparativeDelta = {
      promptRunId: run.id,
      shareOfVoiceByBrand: remapByBrandId(scripted.shareByName, brandsByName) as Record<string, number>,
      sentimentByBrand: remapByBrandId(scripted.sentimentByName, brandsByName) as Record<string, number>,
      praisedFeaturesByBrand: remapByBrandId(scripted.praisedByName, brandsByName) as Record<string, string[]>,
      evidence: scripted.evidence,
    };
    store.comparisons.push(comparison);
    comparisons.push(comparison);
  }

  const gapEvents = buildGapEvents(brandsByName, promptRuns);
  store.gapEvents.push(...gapEvents);

  return {
    accountBrandId: accountBrand.id,
    competitorBrandIds: competitorBrands.map((b) => b.id),
    promptRunCount: promptRuns.length,
    comparisonCount: comparisons.length,
    gapEventCount: gapEvents.length,
  };
}
