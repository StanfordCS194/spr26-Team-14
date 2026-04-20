import { store } from "../../db/store";
import type { AIAnswer } from "./types";

export function getAnswersByWindow(windowStart: string, windowEnd: string): AIAnswer[] {
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();

  return Array.from(store.answers.values()).filter((answer) => {
    const ts = new Date(answer.createdAt).getTime();
    return ts >= start && ts <= end;
  });
}

export function getComparisonsByPromptRun(promptRunIds: string[]) {
  const idSet = new Set(promptRunIds);
  return store.comparisons.filter((comparison) => idSet.has(comparison.promptRunId));
}

export function getPromptRunsByWindow(windowStart: string, windowEnd: string) {
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  return Array.from(store.promptRuns.values()).filter((run) => {
    const ts = new Date(run.createdAt).getTime();
    return ts >= start && ts <= end;
  });
}
