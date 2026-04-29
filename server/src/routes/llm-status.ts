import { Hono } from "hono";

/**
 * Reports whether the server is wired to a real LLM provider so the UI can
 * show "Live" vs "Demo (mock)" without leaking the key itself.
 */
export const llmStatusRoutes = new Hono();

llmStatusRoutes.get("/llm/status", (c) => {
  const provider = process.env.LLM_PROVIDER ?? "openai";
  const hasKey = provider === "openai" ? Boolean(process.env.OPENAI_API_KEY) : false;
  return c.json({ provider, mode: hasKey ? "live" : "mock" });
});
