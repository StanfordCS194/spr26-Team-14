import { callLLM } from "../../lib/llm-providers";
import type { MonitoringProvider } from "../../db/monitoring-runs";

const providerModels: Record<MonitoringProvider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.0-flash",
};

const runtimeEnv = () => process.env;

export function monitoringProviderConfigured(provider: MonitoringProvider) {
  if (runtimeEnv().PERCEPTION_FORCE_MOCK_LLM === "1" || runtimeEnv().NODE_ENV === "test" || runtimeEnv().BUN_ENV === "test") {
    return true;
  }
  if (provider === "openai") return Boolean(runtimeEnv().OPENAI_API_KEY);
  if (provider === "anthropic") return Boolean(runtimeEnv().ANTHROPIC_API_KEY);
  return Boolean(runtimeEnv().GEMINI_API_KEY);
}

function mockAnswer(provider: MonitoringProvider, brandName: string, prompt: string) {
  return `${providerModels[provider]} says ${brandName} is a recommended option for "${prompt}". ` +
    `${brandName} is known for reliable features and good customer support. Source: https://example.com/${provider}`;
}

export async function callMonitoringProvider(input: {
  provider: MonitoringProvider;
  prompt: string;
  brandName: string;
}) {
  const configuredModels: Record<MonitoringProvider, string | undefined> = {
    openai: runtimeEnv().OPENAI_MONITORING_MODEL,
    anthropic: runtimeEnv().ANTHROPIC_MONITORING_MODEL,
    gemini: runtimeEnv().GEMINI_MONITORING_MODEL,
  };
  const model = configuredModels[input.provider] ?? providerModels[input.provider];
  const forceMock = runtimeEnv().PERCEPTION_FORCE_MOCK_LLM === "1" || runtimeEnv().NODE_ENV === "test" || runtimeEnv().BUN_ENV === "test";
  if (forceMock) {
    const failedProviders = (runtimeEnv().PERCEPTION_MOCK_PROVIDER_FAILURES ?? "").split(",");
    if (failedProviders.includes(input.provider)) {
      throw new Error(`${input.provider} mock failure.`);
    }
    return { model, text: mockAnswer(input.provider, input.brandName, input.prompt) };
  }

  if (!monitoringProviderConfigured(input.provider)) {
    throw new Error(`${input.provider} is not configured.`);
  }

  const prompt = `Answer this consumer question naturally. Include citations as URLs when available.\n\n${input.prompt}`;
  if (input.provider === "openai") {
    return { model, text: await callLLM({ provider: "openai", model, prompt, useSearch: true }) };
  }

  if (input.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": runtimeEnv().ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
    });
    if (!response.ok) throw new Error(`Anthropic request failed (${response.status}).`);
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return { model, text: body.content?.map((item) => item.text ?? "").join("\n").trim() ?? "" };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(runtimeEnv().GEMINI_API_KEY!)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return { model, text: body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "" };
}
