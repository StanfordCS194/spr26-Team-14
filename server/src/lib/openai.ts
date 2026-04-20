import OpenAI from "openai";
import { z } from "zod";
import type { AIAnswer, Brand, ComparativeDelta, PromptRun } from "../features/competitive/types";

const mentionSchema = z.object({
  brandId: z.string(),
  shareOfVoice: z.number().min(0).max(1),
  sentiment: z.number().min(-1).max(1),
  praisedFeatures: z.array(z.string()),
});

/** LLMs sometimes emit a single string; normalize to string[]. */
const evidenceStrings = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : [v]));

const judgeOutputSchema = z.object({
  evidence: evidenceStrings,
  mentions: z.array(mentionSchema),
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function interpolateBrand(template: string, brandName: string) {
  return template.replaceAll("{brand}", brandName);
}

/**
 * Brand perception: brand_specific = `{brand}` templates; domain_general = category questions
 * ("who leads," "who is best") answered per brand. No live web search.
 */
const BRAND_ANSWER_SYSTEM_BASE = `You are a brand-perception analyst summarizing how an organization or brand is generally perceived on ONE question at a time.

You are NOT writing a sales pitch or product recommendation. Your job is to describe perceived strengths, weaknesses, and how typical buyers and public conversation tend to frame this brand—like a concise market-research narrative grounded in general knowledge.

Behavior:
- Speak in neutral third person (“Buyers often see…”, “The name is commonly associated with…”). Use “you” only sparingly for typical customer experience.
- Focus strictly on the named brand. If you mention others, do so briefly to clarify relative standing, not to sell.
- Separate three layers when useful: (1) what the organization communicates, (2) what commentators or coverage often claim, (3) recurring praise or complaints in how it is discussed—without pretending you ran surveys or hold private data.
- If something is uncertain or varies by segment, say so. Hedge with “often,” “many buyers,” “can vary,” rather than inventing statistics, rankings, or URLs.
- Structure: one-sentence summary, then 2–4 short paragraphs or bullets with nuance. Roughly 180–320 words.
- Do not output JSON.`;

const BRAND_ANSWER_DOMAIN_EXTRA = `

This turn uses a category-wide question (e.g. who leads, who is most reliable, who is “best”). The same wording is answered separately for each named brand. Describe how THIS brand tends to be positioned when people answer that kind of question—for example as leader, challenger, niche, value player, premium, or fading—not your personal pick.`;

export async function generateBrandAnswer(input: {
  brand: Brand;
  promptRun: PromptRun;
}): Promise<string> {
  const questionText =
    input.promptRun.promptKind === "brand_specific"
      ? interpolateBrand(input.promptRun.prompt, input.brand.name)
      : input.promptRun.prompt;

  if (!openai) {
    const kind = input.promptRun.promptKind;
    return `Mock perception summary for ${input.brand.name} (${kind}). "${questionText.slice(0, 90)}…"`;
  }

  const system =
    input.promptRun.promptKind === "domain_general"
      ? BRAND_ANSWER_SYSTEM_BASE + BRAND_ANSWER_DOMAIN_EXTRA
      : BRAND_ANSWER_SYSTEM_BASE;

  const user =
    input.promptRun.promptKind === "brand_specific"
      ? `Brand: ${input.brand.name}

Brand-specific perception question (the same template is applied to each competitor with their name substituted):
${questionText}

Write the perception summary now.`
      : `Brand: ${input.brand.name}

Domain perception question (same category-level question for each brand; summarize how this brand tends to be positioned—leader, best-in-class, reliable choice, also-ran, etc.—when people discuss the issue below):
${questionText}

Write the perception summary now.`;

  const completion = await openai.responses.create({
    model: input.promptRun.model,
    input: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });

  return completion.output_text;
}

export async function judgeComparativeOutputs(input: {
  promptRun: PromptRun;
  answers: AIAnswer[];
}): Promise<ComparativeDelta> {
  if (!openai) {
    const equalShare = 1 / input.answers.length;
    const shareOfVoiceByBrand: Record<string, number> = {};
    const sentimentByBrand: Record<string, number> = {};
    const praisedFeaturesByBrand: Record<string, string[]> = {};

    for (const answer of input.answers) {
      shareOfVoiceByBrand[answer.brandId] = equalShare;
      sentimentByBrand[answer.brandId] = answer.answerText.includes("strong") ? 0.45 : 0.1;
      praisedFeaturesByBrand[answer.brandId] = answer.answerText.includes("pricing")
        ? ["pricing"]
        : ["onboarding"];
    }

    return {
      promptRunId: input.promptRun.id,
      shareOfVoiceByBrand,
      sentimentByBrand,
      praisedFeaturesByBrand,
      evidence: ["Mock judge used because OPENAI_API_KEY is not set."],
    };
  }

  const rawAnswers = input.answers.map((answer) => ({
    brandId: answer.brandId,
    answerText: answer.answerText,
  }));

  const judgeUserPayload = {
    task:
      input.promptRun.promptKind === "domain_general"
        ? "Each answer describes how a different brand tends to rank or stand on a category-wide question (leader, best, most reliable, etc.). Compare which brands’ described market position sounds strongest or most favorable for this question."
        : "Each answer is an independent brand-specific perception summary for the SAME question. Compare how favorably and how distinctly each brand reads, then score comparatively.",
    promptKind: input.promptRun.promptKind,
    perceptionQuestion: input.promptRun.prompt,
    brands: rawAnswers.map((a) => ({ brandId: a.brandId })),
    answers: rawAnswers,
    judgingRubric: {
      shareOfVoice:
        "Allocate comparative ‘signal strength’ for this perception dimension: which brands’ narratives sound strongest, clearest, or most differentiated in a positive direction. Must sum to 1 across all brands. This is not word count; weight by how compelling the described perception is relative to peers.",
      sentiment:
        "Per brand, from -1 (perception sounds weak, problematic, or often criticized) to 1 (perception sounds strongly positive or advantaged). Neutral or mixed perception is near 0.",
      praisedFeatures:
        "Perceived strengths implied in the text (e.g. leadership, reliability, value, innovation, trust, experience, premium, mainstream). Use lowercase snake_case; omit duplicates.",
      evidence:
        "3–8 bullet-style strings explaining comparative scoring; paraphrase the perception summaries and reference brandId. Must be an array of strings, not one paragraph string.",
    },
    outputContract: {
      format: "JSON only. No markdown fences.",
      fields: {
        evidence: "string[]",
        mentions:
          "array of { brandId, shareOfVoice, sentiment, praisedFeatures } — one object per brand in answers, same brandIds.",
      },
    },
  };

  const JUDGE_SYSTEM = `You are a neutral comparative analyst for brand perception benchmarking.

You receive ONE question and several parallel answers—each answer is about a different brand. Questions are either brand-specific (same template, different names) or domain-general (“who leads,” “who is best,” “most reliable in this category”). In both cases, score comparative standing for dashboards—not a prose winner declaration.

How to read the inputs:
- For brand-specific panels, each text describes that brand on one attribute (trust, quality, etc.). For domain panels, each text explains how that brand tends to be positioned on a category comparison (leadership, best overall, reliability, etc.). Score strength of the **described** position vs peers, not your own preference.
- Answers are independent; if one sounds more decisively positive or “leader-like,” reflect that in shareOfVoice and sentiment.

Scoring rules (apply consistently):
- shareOfVoice: Relative strength of the narrative **for this question**—who sounds most advantaged, most often named as leader/best, or clearest winner in the described consensus. Split when comparable; tilt when one brand clearly dominates in the texts.
- sentiment: Valence of how that brand is portrayed in its own answer.
- praisedFeatures: Themes that read as advantages (leadership, reliability, value, innovation, trust, etc.).

Output requirements:
- Return a single JSON object with exactly two top-level keys: "evidence" and "mentions".
- "evidence" MUST be an array of strings (never a single concatenated string).
- "mentions" MUST have exactly one entry per provided answer, with matching brandId values.
- shareOfVoice values must be numbers in [0,1] and must sum to 1.0 across all mentions.
- sentiment must be in [-1,1]. praisedFeatures must be an array of strings (empty array if none).

Do not include commentary outside the JSON object.`;

  const completion = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: JUDGE_SYSTEM,
      },
      {
        role: "user",
        content: JSON.stringify(judgeUserPayload),
      },
    ],
  });

  const parsed = judgeOutputSchema.parse(JSON.parse(completion.output_text));
  const shareOfVoiceByBrand: Record<string, number> = {};
  const sentimentByBrand: Record<string, number> = {};
  const praisedFeaturesByBrand: Record<string, string[]> = {};

  for (const mention of parsed.mentions) {
    shareOfVoiceByBrand[mention.brandId] = mention.shareOfVoice;
    sentimentByBrand[mention.brandId] = mention.sentiment;
    praisedFeaturesByBrand[mention.brandId] = mention.praisedFeatures;
  }

  return {
    promptRunId: input.promptRun.id,
    shareOfVoiceByBrand,
    sentimentByBrand,
    praisedFeaturesByBrand,
    evidence: parsed.evidence,
  };
}
