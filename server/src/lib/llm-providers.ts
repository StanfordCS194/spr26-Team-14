import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

export type LLMProviderName = "mock" | "openai";

export interface LLMMessage {
  role: "system" | "user";
  content: string;
}

export interface LLMCallInput {
  maxOutputTokens?: number;
  messages?: LLMMessage[];
  model?: string;
  onCompleted?: () => void;
  onDelta?: (text: string) => void;
  onStarted?: () => void;
  prompt: string;
  provider?: LLMProviderName;
  useSearch?: boolean;
}

export interface StructuredLLMCallInput<T> extends LLMCallInput {
  mockValue?: T;
  schema: z.ZodType<T>;
  schemaName: string;
}

interface LLMProvider {
  call(input: Omit<LLMCallInput, "provider">): Promise<string>;
  structured<T>(input: Omit<StructuredLLMCallInput<T>, "provider">): Promise<T>;
  configured(): boolean;
}

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const openAIClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const STREAM_FLUSH_CHARS = 140;

function outputTextWithCitations(response: {
  output?: Array<{ type?: string; content?: Array<{
    type?: string;
    text?: string;
    annotations?: Array<{ type?: string; end_index?: number; url?: string }>;
  }> }>;
  output_text?: string;
}) {
  const parts = response.output?.flatMap((item) => item.type === "message" ? item.content ?? [] : []) ?? [];
  const annotated = parts.flatMap((part) => {
    if (part.type !== "output_text" || !part.text) return [];
    let text = part.text;
    const citations = (part.annotations ?? [])
      .filter((annotation) =>
        annotation.type === "url_citation" &&
        typeof annotation.end_index === "number" &&
        Boolean(annotation.url)
      )
      .sort((a, b) => b.end_index! - a.end_index!);
    for (const citation of citations) {
      text = `${text.slice(0, citation.end_index)} [${citation.url}]${text.slice(citation.end_index)}`;
    }
    return [text];
  });
  return annotated.join("\n").trim() || response.output_text || "";
}

function flush(buffer: string, onDelta?: (text: string) => void) {
  const text = buffer.trim();
  if (text) {
    onDelta?.(text);
  }
}

const providers: Record<LLMProviderName, LLMProvider> = {
  mock: {
    configured: () => true,
    async call(input) {
      input.onStarted?.();
      const text = `Mock ${input.model ?? "model"} response: ${input.prompt.slice(0, 120)}`;
      input.onDelta?.(text);
      input.onCompleted?.();
      return text;
    },
    async structured(input) {
      input.onStarted?.();
      input.onCompleted?.();
      if (input.mockValue !== undefined) {
        return input.mockValue;
      }
      return input.schema.parse({});
    },
  },

  openai: {
    configured: () => Boolean(openAIClient),
    async call(input) {
      if (!openAIClient) {
        throw new Error("OpenAI client not configured.");
      }

      input.onStarted?.();
      const runner = openAIClient.responses.stream({
        model: input.model ?? "gpt-4.1-mini",
        max_output_tokens: input.maxOutputTokens,
        input: input.messages ?? [{ role: "user", content: input.prompt }],
        tools: input.useSearch ? [{ type: "web_search" }] : undefined,
      });

      let buffer = "";
      let fullText = "";

      runner.on("response.output_text.delta", (event) => {
        fullText += event.delta;
        buffer += event.delta;

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          flush(buffer.slice(0, newlineIndex), input.onDelta);
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");
        }

        if (buffer.length >= STREAM_FLUSH_CHARS) {
          flush(buffer, input.onDelta);
          buffer = "";
        }
      });

      const response = await runner.finalResponse();
      flush(buffer, input.onDelta);
      input.onCompleted?.();

      return outputTextWithCitations(response) || fullText;
    },
    async structured(input) {
      if (!openAIClient) {
        throw new Error("OpenAI client not configured.");
      }

      input.onStarted?.();
      try {
        const response = await openAIClient.responses.parse({
          model: input.model ?? "gpt-4.1-mini",
          max_output_tokens: input.maxOutputTokens,
          input: input.messages ?? [{ role: "user", content: input.prompt }],
          text: {
            format: zodTextFormat(input.schema, input.schemaName),
          },
          tools: input.useSearch ? [{ type: "web_search" }] : undefined,
        } as Parameters<typeof openAIClient.responses.parse>[0]);
        input.onCompleted?.();
        return input.schema.parse(response.output_parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown structured LLM error.";
        throw new Error(`Structured LLM call failed for ${input.schemaName}: ${message}`);
      }
    },
  },
};

export function configuredLLMProvider(): LLMProviderName {
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? env;
  if (
    runtimeEnv.PERCEPTION_FORCE_MOCK_LLM === "1" ||
    runtimeEnv.NODE_ENV === "test" ||
    runtimeEnv.BUN_ENV === "test"
  ) {
    return "mock";
  }
  return (runtimeEnv.LLM_PROVIDER as LLMProviderName | undefined) ?? "openai";
}

export function isLLMProviderConfigured(provider = configuredLLMProvider()) {
  return providers[provider]?.configured() ?? false;
}

export async function callLLM(input: LLMCallInput) {
  const providerName = input.provider ?? configuredLLMProvider();
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${providerName}`);
  }
  return provider.call(input);
}

export async function callStructuredLLM<T>(input: StructuredLLMCallInput<T>) {
  const providerName = input.provider ?? configuredLLMProvider();
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${providerName}`);
  }
  return provider.structured(input);
}
