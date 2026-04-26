import OpenAI from "openai";

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
}

interface LLMProvider {
  call(input: Omit<LLMCallInput, "provider">): Promise<string>;
  configured(): boolean;
}

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const openAIClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const STREAM_FLUSH_CHARS = 140;

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

      return typeof response.output_text === "string" && response.output_text.trim()
        ? response.output_text
        : fullText;
    },
  },
};

export function configuredLLMProvider(): LLMProviderName {
  return (env.LLM_PROVIDER as LLMProviderName | undefined) ?? "openai";
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
