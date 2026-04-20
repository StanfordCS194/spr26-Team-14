import type { PromptKind } from "./types";

export type CompetitiveProgressEvent =
  | { type: "connected"; message: string; ts: string }
  | { type: "run_started"; message: string; ts: string }
  | {
      type: "answer_started" | "answer_completed";
      brandId: string;
      brandName: string;
      prompt: string;
      promptKind: PromptKind;
      message: string;
      ts: string;
    }
  | {
      type: "answer_delta";
      brandId: string;
      brandName: string;
      prompt: string;
      promptKind: PromptKind;
      text: string;
      ts: string;
    }
  | {
      type: "judge_started" | "judge_completed";
      prompt: string;
      promptKind: PromptKind;
      message: string;
      ts: string;
    }
  | {
      type: "judge_delta";
      prompt: string;
      promptKind: PromptKind;
      text: string;
      ts: string;
    }
  | { type: "run_completed"; message: string; ts: string }
  | { type: "run_failed"; message: string; ts: string };

export type CompetitiveProgressPayload = CompetitiveProgressEvent extends infer Event
  ? Event extends { ts: string }
    ? Omit<Event, "ts">
    : never
  : never;
export type ProgressReporter = (event: CompetitiveProgressPayload) => void;

const listenersBySession = new Map<string, Set<(event: CompetitiveProgressEvent) => void>>();

export function subscribeToCompetitiveProgress(
  sessionId: string,
  listener: (event: CompetitiveProgressEvent) => void,
) {
  const listeners = listenersBySession.get(sessionId) ?? new Set<(event: CompetitiveProgressEvent) => void>();
  listeners.add(listener);
  listenersBySession.set(sessionId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersBySession.delete(sessionId);
    }
  };
}

export function publishCompetitiveProgress(sessionId: string, payload: CompetitiveProgressPayload) {
  const listeners = listenersBySession.get(sessionId);
  if (!listeners || listeners.size === 0) {
    return;
  }

  const event = { ...payload, ts: new Date().toISOString() } as CompetitiveProgressEvent;
  for (const listener of listeners) {
    listener(event);
  }
}
