import { z } from "zod";
import { store, getNowIso } from "../../db/store";
import type { ProgressReporter } from "./progress";
import { generateBrandAnswer, judgeComparativeOutputs } from "../../lib/llm";
import type { AIAnswer, BenchmarkProvider, CohortRun, CompetitiveDelta, PromptKind, PromptRun } from "./types";

const PROMPT_RUN_CONCURRENCY = 4;

const cohortRunSchema = z.object({
  accountBrandId: z.string().min(1),
  competitorBrandIds: z.array(z.string().min(1)).length(5),
  promptSetId: z.string().min(1),
  provider: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  models: z.array(z.string().min(1)).min(1),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
});

function toTuple(values: string[]): [string, string, string, string, string] {
  if (values.length !== 5) {
    throw new Error("Exactly five competitors are required.");
  }
  return [values[0]!, values[1]!, values[2]!, values[3]!, values[4]!];
}

export function parseCohortRun(input: unknown): CohortRun {
  const parsed = cohortRunSchema.parse(input);
  return {
    ...parsed,
    competitorBrandIds: toTuple(parsed.competitorBrandIds),
  };
}

function createPromptRuns(
  promptSetId: string,
  brandSpecific: string[],
  domain: string[],
  provider: BenchmarkProvider,
  models: string[],
): PromptRun[] {
  const now = getNowIso();
  const runs: PromptRun[] = [];

  const pushRuns = (prompts: string[], promptKind: PromptKind) => {
    for (const model of models) {
      for (const prompt of prompts) {
        const run: PromptRun = {
          id: crypto.randomUUID(),
          promptSetId,
          prompt,
          promptKind,
          provider,
          model,
          createdAt: now,
        };
        store.promptRuns.set(run.id, run);
        runs.push(run);
      }
    }
  };

  pushRuns(brandSpecific, "brand_specific");
  pushRuns(domain, "domain_general");

  return runs;
}

async function createAnswersForPromptRun(
  promptRun: PromptRun,
  brandIds: string[],
  reportProgress?: ProgressReporter,
): Promise<AIAnswer[]> {
  const createdAt = getNowIso();
  return Promise.all(
    brandIds.map(async (brandId) => {
    const brand = store.brands.get(brandId);
    if (!brand) {
      throw new Error(`Brand not found for id ${brandId}`);
    }
      const answerText = await generateBrandAnswer({ brand, promptRun, reportProgress });
      const answer: AIAnswer = {
      id: crypto.randomUUID(),
      promptRunId: promptRun.id,
      brandId,
      answerText,
      createdAt,
    };
    store.answers.set(answer.id, answer);
      return answer;
    }),
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!, currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function runCompetitivePipeline(input: CohortRun): Promise<{
  promptRuns: PromptRun[];
  answers: AIAnswer[];
  comparisons: CompetitiveDelta[];
}>;
export async function runCompetitivePipeline(
  input: CohortRun,
  options?: { reportProgress?: ProgressReporter },
): Promise<{
  promptRuns: PromptRun[];
  answers: AIAnswer[];
  comparisons: CompetitiveDelta[];
}> {
  const promptSet = store.promptSets.get(input.promptSetId);
  if (!promptSet) {
    throw new Error("Prompt set not found.");
  }

  const brandIds = [input.accountBrandId, ...input.competitorBrandIds];
  const promptRuns = createPromptRuns(
    promptSet.id,
    promptSet.brandSpecificPrompts,
    promptSet.domainPrompts,
    input.provider,
    input.models,
  );

  const allAnswers: AIAnswer[] = [];
  const comparisons = await mapWithConcurrency(promptRuns, PROMPT_RUN_CONCURRENCY, async (promptRun) => {
    const answers = await createAnswersForPromptRun(promptRun, brandIds, options?.reportProgress);
    allAnswers.push(...answers);
    return judgeComparativeOutputs({ promptRun, answers, reportProgress: options?.reportProgress });
  });

  for (const comparison of comparisons) {
    store.comparisons.push(comparison);
  }

  return { promptRuns, answers: allAnswers, comparisons };
}
