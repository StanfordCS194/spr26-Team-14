import type { AIAnswer } from "../competitive/types";
import type { AccuracyFlag, ClaimDimension, FactSheet } from "./types";

/**
 * Detect factual contradictions between an AI-generated answer and a
 * brand-provided fact sheet. v0 is a deterministic substring + regex pass:
 * we look for prices, founding years, and named cities in the answer and
 * compare them to the fact sheet. This is intentionally simple and low-risk
 * for the demo; an LLM-driven extractor is a follow-up.
 */

const PRICE_REGEX = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*\/\s*(?:mo|month|yr|year|user|seat))?/gi;
const YEAR_REGEX = /\b(1[89]\d{2}|20\d{2})\b/g;

function snippetAround(text: string, index: number, span = 120) {
  const start = Math.max(0, index - span / 2);
  const end = Math.min(text.length, index + span / 2);
  return text.slice(start, end).trim();
}

function parsePriceFromString(value: string): number | null {
  const match = value.match(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]!.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function isClose(a: number, b: number) {
  if (a === b) return true;
  // Treat differences within ±10% as not-a-contradiction to absorb rounding.
  return Math.abs(a - b) / Math.max(a, b) < 0.1;
}

function makeFlag(
  dimension: ClaimDimension,
  claim: string,
  groundTruth: string,
  evidence: string,
  brandId: string,
  answer: AIAnswer,
): AccuracyFlag {
  return {
    id: crypto.randomUUID(),
    brandId,
    answerId: answer.id,
    promptRunId: answer.promptRunId,
    dimension,
    verdict: "contradicted",
    claim,
    groundTruth,
    evidence,
    detectedAt: new Date().toISOString(),
  };
}

function detectPricingFlags(factSheet: FactSheet, answer: AIAnswer): AccuracyFlag[] {
  if (!factSheet.pricing) {
    return [];
  }
  const truthValue = parsePriceFromString(factSheet.pricing);
  if (truthValue == null) {
    return [];
  }

  const flags: AccuracyFlag[] = [];
  const seen = new Set<number>();
  for (const match of answer.answerText.matchAll(PRICE_REGEX)) {
    const claimValue = Number((match[1] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(claimValue) || seen.has(claimValue) || isClose(claimValue, truthValue)) {
      seen.add(claimValue);
      continue;
    }
    seen.add(claimValue);
    flags.push(
      makeFlag(
        "pricing",
        match[0]!,
        factSheet.pricing,
        snippetAround(answer.answerText, match.index ?? 0),
        factSheet.brandId,
        answer,
      ),
    );
  }
  return flags;
}

function detectFoundedYearFlags(factSheet: FactSheet, answer: AIAnswer): AccuracyFlag[] {
  if (!factSheet.foundedYear) {
    return [];
  }
  const flags: AccuracyFlag[] = [];
  const seen = new Set<number>();
  for (const match of answer.answerText.matchAll(YEAR_REGEX)) {
    const year = Number(match[1]);
    if (seen.has(year) || year === factSheet.foundedYear) {
      seen.add(year);
      continue;
    }
    seen.add(year);
    // Only flag years that look like they're describing founding context.
    const window = snippetAround(answer.answerText, match.index ?? 0, 80).toLowerCase();
    if (!/(founded|founding|since|established|launched|debuted|opened)/.test(window)) {
      continue;
    }
    flags.push(
      makeFlag(
        "founded_year",
        String(year),
        String(factSheet.foundedYear),
        snippetAround(answer.answerText, match.index ?? 0),
        factSheet.brandId,
        answer,
      ),
    );
  }
  return flags;
}

function detectHeadquartersFlags(factSheet: FactSheet, answer: AIAnswer): AccuracyFlag[] {
  if (!factSheet.headquarters) {
    return [];
  }
  const truthCity = factSheet.headquarters.split(",")[0]?.trim().toLowerCase();
  if (!truthCity) {
    return [];
  }
  // If the answer mentions "headquartered in" / "based in" with a different city, flag it.
  const phraseRegex = /(headquartered|based|located)\s+in\s+([a-z][a-z .'\-]+?)(?=[,.;]| and | with | which )/gi;
  const flags: AccuracyFlag[] = [];
  for (const match of answer.answerText.matchAll(phraseRegex)) {
    const claimCity = match[2]?.trim() ?? "";
    if (!claimCity || claimCity.toLowerCase().includes(truthCity)) {
      continue;
    }
    flags.push(
      makeFlag(
        "headquarters",
        claimCity,
        factSheet.headquarters,
        snippetAround(answer.answerText, match.index ?? 0),
        factSheet.brandId,
        answer,
      ),
    );
  }
  return flags;
}

export function detectAccuracyFlags(input: { factSheet: FactSheet; answers: AIAnswer[] }): AccuracyFlag[] {
  const flags: AccuracyFlag[] = [];
  for (const answer of input.answers) {
    flags.push(...detectPricingFlags(input.factSheet, answer));
    flags.push(...detectFoundedYearFlags(input.factSheet, answer));
    flags.push(...detectHeadquartersFlags(input.factSheet, answer));
  }
  return flags;
}
