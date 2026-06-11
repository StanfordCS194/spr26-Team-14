import OpenAI from "openai";
import { z } from "zod";
import { store } from "../db/store";
import type { ProgressReporter } from "../features/competitive/progress";
import type { AIAnswer, BenchmarkProvider, Brand, ComparativeDelta, PromptRun } from "../features/competitive/types";

type SupportedLLMProvider = BenchmarkProvider;

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const openAIApiKey = env.OPENAI_API_KEY;
const openAIClient = openAIApiKey ? new OpenAI({ apiKey: openAIApiKey }) : null;

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

const citationSchema = z.object({
  url: z.string().min(1),
  claim: z.string().min(1),
  brandId: z.string().optional(),
});

const judgeOutputSchema = z.object({
  evidence: evidenceStrings,
  mentions: z.array(mentionSchema),
  citations: z.array(citationSchema).default([]),
});

/** The judge must ground its comparison in at least this many cited sources. */
const MIN_JUDGE_CITATIONS = 25;

const BRAND_ANSWER_MAX_OUTPUT_TOKENS = 220;
const JUDGE_MAX_OUTPUT_TOKENS = 4000;
const STREAM_FLUSH_CHARS = 140;

function runtimeEnv() {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? env;
}

function normalizeProvider(provider: string | undefined): SupportedLLMProvider {
  if (provider === "anthropic" || provider === "gemini" || provider === "openai") {
    return provider;
  }
  return "openai";
}

function providerForPromptRun(promptRun: PromptRun): SupportedLLMProvider {
  return promptRun.provider ?? normalizeProvider(runtimeEnv().LLM_PROVIDER);
}

function forceMockLLM() {
  const currentEnv = runtimeEnv();
  return currentEnv.PERCEPTION_FORCE_MOCK_LLM === "1" ||
    currentEnv.NODE_ENV === "test" ||
    currentEnv.BUN_ENV === "test";
}

function providerConfigured(provider: SupportedLLMProvider) {
  const currentEnv = runtimeEnv();
  if (provider === "openai") return Boolean(currentEnv.OPENAI_API_KEY);
  if (provider === "anthropic") return Boolean(currentEnv.ANTHROPIC_API_KEY);
  return Boolean(currentEnv.GEMINI_API_KEY);
}

function shouldUseMock(provider: SupportedLLMProvider) {
  return forceMockLLM() || !providerConfigured(provider);
}

function getProviderLabel(provider: SupportedLLMProvider) {
  return `llm:${provider}`;
}

function getStreamingClient(provider: SupportedLLMProvider) {
  if (provider !== "openai" || shouldUseMock(provider)) {
    return null;
  }
  if (!openAIClient) {
    return null;
  }
  return openAIClient;
}

function interpolateBrand(template: string, brandName: string) {
  return template.replaceAll("{brand}", brandName);
}

function compactLabel(value: string) {
  return value.replaceAll(/\s+/g, " ").trim().slice(0, 80);
}

function flushStreamBuffer(
  provider: SupportedLLMProvider,
  label: string,
  buffer: string,
  onDelta?: (text: string) => void,
) {
  const text = buffer.trim();
  if (!text) {
    return;
  }
  console.log(`[${getProviderLabel(provider)}] ${label}: ${text}`);
  onDelta?.(text);
}

type CompetitiveLLMResponseInput = {
  label: string;
  provider: SupportedLLMProvider;
  model: string;
  maxOutputTokens: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
  onStarted?: () => void;
  onDelta?: (text: string) => void;
  onCompleted?: () => void;
};

async function createStreamedResponse(input: CompetitiveLLMResponseInput) {
  if (input.provider === "anthropic") {
    return createAnthropicResponse(input);
  }
  if (input.provider === "gemini") {
    return createGeminiResponse(input);
  }

  const client = getStreamingClient(input.provider);
  if (!client) {
    throw new Error(`${input.provider} client not configured.`);
  }

  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: started`);
  input.onStarted?.();

  const runner = client.responses.stream({
    model: input.model,
    max_output_tokens: input.maxOutputTokens,
    input: input.messages,
  });

  let buffer = "";
  let fullText = "";

  runner.on("response.output_text.delta", (event) => {
    fullText += event.delta;
    buffer += event.delta;

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      flushStreamBuffer(input.provider, input.label, buffer.slice(0, newlineIndex), input.onDelta);
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }

    if (buffer.length >= STREAM_FLUSH_CHARS) {
      flushStreamBuffer(input.provider, input.label, buffer, input.onDelta);
      buffer = "";
    }
  });

  const response = await runner.finalResponse();
  flushStreamBuffer(input.provider, input.label, buffer, input.onDelta);
  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: completed`);
  input.onCompleted?.();
  return typeof response.output_text === "string" && response.output_text.trim().length > 0
    ? response.output_text
    : fullText;
}

async function createAnthropicResponse(input: CompetitiveLLMResponseInput) {
  const apiKey = runtimeEnv().ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("anthropic client not configured.");
  }

  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: started`);
  input.onStarted?.();

  const system = input.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const messages = input.messages
    .filter((message) => message.role === "user")
    .map((message) => ({ role: "user" as const, content: message.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxOutputTokens,
      system: system || undefined,
      messages,
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic request failed (${response.status}).`);
  }

  const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.map((item) => item.text ?? "").join("\n").trim() ?? "";
  flushStreamBuffer(input.provider, input.label, text, input.onDelta);
  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: completed`);
  input.onCompleted?.();
  return text;
}

async function createGeminiResponse(input: CompetitiveLLMResponseInput) {
  const apiKey = runtimeEnv().GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("gemini client not configured.");
  }

  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: started`);
  input.onStarted?.();

  const prompt = input.messages
    .map((message) => `${message.role === "system" ? "System" : "User"}:\n${message.content}`)
    .join("\n\n");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${
      encodeURIComponent(apiKey)
    }`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: input.maxOutputTokens },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}).`);
  }

  const body = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
  flushStreamBuffer(input.provider, input.label, text, input.onDelta);
  console.log(`[${getProviderLabel(input.provider)}] ${input.label}: completed`);
  input.onCompleted?.();
  return text;
}

function extractJSONObject(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return trimmed;
  }
  return trimmed.slice(start, end + 1);
}

/**
 * Brand perception: brand_specific = `{brand}` templates; domain_general = category questions
 * ("who leads," "who is best") answered per brand. No live web search.
 */
const BRAND_ANSWER_SYSTEM_BASE = `You are a brand-perception analyst summarizing how an organization or brand is generally perceived on ONE question at a time.

You are NOT writing a sales pitch or product recommendation. Your job is to describe perceived strengths, weaknesses, and how typical buyers and public conversation tend to frame this brand-like a concise market-research narrative grounded in general knowledge.

Behavior:
- Speak in neutral third person ("Buyers often see...", "The name is commonly associated with..."). Use "you" only sparingly for typical customer experience.
- Focus strictly on the named brand. If you mention others, do so briefly to clarify relative standing, not to sell.
- Separate three layers when useful: (1) what the organization communicates, (2) what commentators or coverage often claim, (3) recurring praise or complaints in how it is discussed-without pretending you ran surveys or hold private data.
- If something is uncertain or varies by segment, say so. Hedge with "often," "many buyers," "can vary," rather than inventing statistics, rankings, or URLs.
- Structure: one-sentence summary, then 2-4 short paragraphs or bullets with nuance. Keep it compact: roughly 90-160 words.
- Do not output JSON.`;

const BRAND_ANSWER_DOMAIN_EXTRA = `

This turn uses a category-wide question (e.g. who leads, who is most reliable, who is "best"). The same wording is answered separately for each named brand. Describe how THIS brand tends to be positioned when people answer that kind of question-for example as leader, challenger, niche, value player, premium, or fading-not your personal pick.`;

export async function generateBrandAnswer(input: {
  brand: Brand;
  promptRun: PromptRun;
  reportProgress?: ProgressReporter;
}): Promise<string> {
  const provider = providerForPromptRun(input.promptRun);
  const questionText =
    input.promptRun.promptKind === "brand_specific"
      ? interpolateBrand(input.promptRun.prompt, input.brand.name)
      : input.promptRun.prompt;

  if (shouldUseMock(provider)) {
    const kind = input.promptRun.promptKind;
    const text =
      `Mock ${provider} perception summary for ${input.brand.name} (${kind}). "${questionText.slice(0, 90)}..."`;
    input.reportProgress?.({
      type: "answer_started",
      brandId: input.brand.id,
      brandName: input.brand.name,
      prompt: questionText,
      promptKind: kind,
      message: "Started brand summary.",
    });
    input.reportProgress?.({
      type: "answer_delta",
      brandId: input.brand.id,
      brandName: input.brand.name,
      prompt: questionText,
      promptKind: kind,
      text,
    });
    input.reportProgress?.({
      type: "answer_completed",
      brandId: input.brand.id,
      brandName: input.brand.name,
      prompt: questionText,
      promptKind: kind,
      message: "Completed brand summary.",
    });
    return text;
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

Domain perception question (same category-level question for each brand; summarize how this brand tends to be positioned-leader, best-in-class, reliable choice, also-ran, etc.-when people discuss the issue below):
${questionText}

Write the perception summary now.`;

  return createStreamedResponse({
    label: `answer ${input.promptRun.promptKind} ${input.brand.name} :: ${compactLabel(questionText)}`,
    provider,
    model: input.promptRun.model,
    maxOutputTokens: BRAND_ANSWER_MAX_OUTPUT_TOKENS,
    onStarted: () => {
      input.reportProgress?.({
        type: "answer_started",
        brandId: input.brand.id,
        brandName: input.brand.name,
        prompt: questionText,
        promptKind: input.promptRun.promptKind,
        message: "Started brand summary.",
      });
    },
    onDelta: (text) => {
      input.reportProgress?.({
        type: "answer_delta",
        brandId: input.brand.id,
        brandName: input.brand.name,
        prompt: questionText,
        promptKind: input.promptRun.promptKind,
        text,
      });
    },
    onCompleted: () => {
      input.reportProgress?.({
        type: "answer_completed",
        brandId: input.brand.id,
        brandName: input.brand.name,
        prompt: questionText,
        promptKind: input.promptRun.promptKind,
        message: "Completed brand summary.",
      });
    },
    messages: [
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
}

export async function judgeComparativeOutputs(input: {
  promptRun: PromptRun;
  answers: AIAnswer[];
  reportProgress?: ProgressReporter;
}): Promise<ComparativeDelta> {
  const provider = providerForPromptRun(input.promptRun);
  if (shouldUseMock(provider)) {
    input.reportProgress?.({
      type: "judge_started",
      prompt: input.promptRun.prompt,
      promptKind: input.promptRun.promptKind,
      message: "Started comparative judging.",
    });
    const shareOfVoiceByBrand: Record<string, number> = {};
    const sentimentByBrand: Record<string, number> = {};
    const praisedFeaturesByBrand: Record<string, string[]> = {};
    const competitorShare = input.answers.length > 1 ? 0.84 / (input.answers.length - 1) : 1;

    for (const [index, answer] of input.answers.entries()) {
      const isAccountBrand = index === 0;
      shareOfVoiceByBrand[answer.brandId] = isAccountBrand ? 0.16 : competitorShare;
      sentimentByBrand[answer.brandId] = isAccountBrand ? 0.12 : 0.42;
      praisedFeaturesByBrand[answer.brandId] = isAccountBrand
        ? ["visibility"]
        : index % 2 === 0
          ? ["value", "reliability"]
          : ["innovation", "content_quality"];
    }

    const citations = Array.from({ length: MIN_JUDGE_CITATIONS }, (_, index) => {
      const answer = input.answers[index % input.answers.length]!;
      const brandName = store.brands.get(answer.brandId)?.name ?? answer.brandId;
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        url: `https://example.com/perception/${slug}/source-${index + 1}`,
        claim: `Mock source ${index + 1} corroborating how ${brandName} is perceived on this question.`,
        brandId: answer.brandId,
      };
    });

    const result = {
      promptRunId: input.promptRun.id,
      shareOfVoiceByBrand,
      sentimentByBrand,
      praisedFeaturesByBrand,
      evidence: [`Mock judge used because ${provider.toUpperCase()} is not configured; competitors expose fix-it gaps.`],
      citations,
    };
    input.reportProgress?.({
      type: "judge_delta",
      prompt: input.promptRun.prompt,
      promptKind: input.promptRun.promptKind,
      text: result.evidence[0]!,
    });
    input.reportProgress?.({
      type: "judge_completed",
      prompt: input.promptRun.prompt,
      promptKind: input.promptRun.promptKind,
      message: "Completed comparative judging.",
    });
    return result;
  }

  const rawAnswers = input.answers.map((answer) => ({
    brandId: answer.brandId,
    brandName: store.brands.get(answer.brandId)?.name ?? answer.brandId,
    answerText: answer.answerText,
  }));

  const judgeUserPayload = {
    task:
      input.promptRun.promptKind === "domain_general"
        ? "Each answer describes how a different brand tends to rank or stand on a category-wide question (leader, best, most reliable, etc.). Compare which brands' described market position sounds strongest or most favorable for this question."
        : "Each answer is an independent brand-specific perception summary for the SAME question. Compare how favorably and how distinctly each brand reads, then score comparatively.",
    promptKind: input.promptRun.promptKind,
    perceptionQuestion: input.promptRun.prompt,
    brands: rawAnswers.map((a) => ({ brandId: a.brandId, brandName: a.brandName })),
    answers: rawAnswers,
    judgingRubric: {
      shareOfVoice:
        "Allocate comparative signal strength for this perception dimension: which brands' narratives sound strongest, clearest, or most differentiated in a positive direction. Must sum to 1 across all brands. This is not word count; weight by how compelling the described perception is relative to peers.",
      sentiment:
        "Per brand, from -1 (perception sounds weak, problematic, or often criticized) to 1 (perception sounds strongly positive or advantaged). Neutral or mixed perception is near 0.",
      praisedFeatures:
        "Perceived strengths implied in the text (e.g. leadership, reliability, value, innovation, trust, experience, premium, mainstream). Use lowercase snake_case; omit duplicates.",
      evidence:
        "Exactly 3 very short strings explaining comparative scoring; each string must be under 18 words and reference brand names, not brandIds. Must be an array of strings, not one paragraph string.",
      citations:
        `At least ${MIN_JUDGE_CITATIONS} sources that ground the comparative claims. Each citation pairs a plausible, well-formed source URL with the specific factual claim it supports about one of the brands. Spread citations across all brands; prefer reputable domains (reviews, publications, industry reports, forums).`,
    },
    outputContract: {
      format: "JSON only. No markdown fences.",
      fields: {
        evidence: "string[]",
        mentions:
          "array of { brandId, shareOfVoice, sentiment, praisedFeatures } - one object per brand in answers, same brandIds.",
        citations:
          `array of at least ${MIN_JUDGE_CITATIONS} objects { url, claim, brandId } - url is an http(s) source link, claim is the factual statement it supports, brandId is one of the provided brandIds.`,
      },
    },
  };

  const JUDGE_SYSTEM = `You are a neutral comparative analyst for brand perception benchmarking.

You receive ONE question and several parallel answers-each answer is about a different brand. Questions are either brand-specific (same template, different names) or domain-general ("who leads," "who is best," "most reliable in this category"). In both cases, score comparative standing for dashboards-not a prose winner declaration.

How to read the inputs:
- For brand-specific panels, each text describes that brand on one attribute (trust, quality, etc.). For domain panels, each text explains how that brand tends to be positioned on a category comparison (leadership, best overall, reliability, etc.). Score strength of the described position vs peers, not your own preference.
- Answers are independent; if one sounds more decisively positive or leader-like, reflect that in shareOfVoice and sentiment.

Scoring rules (apply consistently):
- shareOfVoice: Relative strength of the narrative for this question-who sounds most advantaged, most often named as leader/best, or clearest winner in the described consensus. Split when comparable; tilt when one brand clearly dominates in the texts.
- sentiment: Valence of how that brand is portrayed in its own answer.
- praisedFeatures: Themes that read as advantages (leadership, reliability, value, innovation, trust, etc.).

Output requirements:
- Return a single JSON object with exactly three top-level keys: "evidence", "mentions", and "citations".
- "evidence" MUST be an array of strings (never a single concatenated string).
- Evidence strings MUST use human-readable brand names, never UUIDs or brandId values.
- Keep evidence strings short and compact.
- "mentions" MUST have exactly one entry per provided answer, with matching brandId values.
- shareOfVoice values must be numbers in [0,1] and must sum to 1.0 across all mentions.
- sentiment must be in [-1,1]. praisedFeatures must be an array of strings (empty array if none).
- "citations" MUST be an array of AT LEAST ${MIN_JUDGE_CITATIONS} objects, each { "url", "claim", "brandId" }.
- Each citation's "url" must be a complete, plausible http(s) source link; "claim" is the specific factual statement that source supports; "brandId" must match one of the provided brandIds.
- Distribute the citations across every brand in the panel rather than concentrating them on one brand.

Do not include commentary outside the JSON object.`;

  const outputText = await createStreamedResponse({
    label: `judge ${input.promptRun.promptKind} :: ${compactLabel(input.promptRun.prompt)}`,
    provider,
    model: input.promptRun.model,
    maxOutputTokens: JUDGE_MAX_OUTPUT_TOKENS,
    onStarted: () => {
      input.reportProgress?.({
        type: "judge_started",
        prompt: input.promptRun.prompt,
        promptKind: input.promptRun.promptKind,
        message: "Started comparative judging.",
      });
    },
    onDelta: (text) => {
      input.reportProgress?.({
        type: "judge_delta",
        prompt: input.promptRun.prompt,
        promptKind: input.promptRun.promptKind,
        text,
      });
    },
    onCompleted: () => {
      input.reportProgress?.({
        type: "judge_completed",
        prompt: input.promptRun.prompt,
        promptKind: input.promptRun.promptKind,
        message: "Completed comparative judging.",
      });
    },
    messages: [
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

  const parsed = judgeOutputSchema.parse(JSON.parse(extractJSONObject(outputText)));
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
    citations: parsed.citations,
  };
}
