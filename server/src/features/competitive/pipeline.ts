import { z } from "zod";
import { store, getNowIso } from "../../db/store";
import { generateBrandAnswer, judgeComparativeOutputs } from "../../lib/openai";
import type { AIAnswer, CohortRun, CompetitiveDelta, PromptKind, PromptRun } from "./types";

const cohortRunSchema = z.object({
  accountBrandId: z.string().min(1),
  competitorBrandIds: z.array(z.string().min(1)).length(5),
  promptSetId: z.string().min(1),
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

async function createAnswersForPromptRun(promptRun: PromptRun, brandIds: string[]): Promise<AIAnswer[]> {
  const answers: AIAnswer[] = [];
  const createdAt = getNowIso();

  for (const brandId of brandIds) {
    const brand = store.brands.get(brandId);
    if (!brand) {
      throw new Error(`Brand not found for id ${brandId}`);
    }
    const answerText = await generateBrandAnswer({ brand, promptRun });
    const answer: AIAnswer = {
      id: crypto.randomUUID(),
      promptRunId: promptRun.id,
      brandId,
      answerText,
      createdAt,
    };
    store.answers.set(answer.id, answer);
    answers.push(answer);
  }

  return answers;
}

export async function runCompetitivePipeline(input: CohortRun): Promise<{
  promptRuns: PromptRun[];
  answers: AIAnswer[];
  comparisons: CompetitiveDelta[];
}> {
  const promptSet = store.promptSets.get(input.promptSetId);
  if (!promptSet) {
    throw new Error("Prompt set not found.");
  }

  const brandIds = [input.accountBrandId, ...input.competitorBrandIds];
  const promptRuns = createPromptRuns(promptSet.id, promptSet.brandSpecificPrompts, promptSet.domainPrompts, input.models);

  const allAnswers: AIAnswer[] = [];
  const comparisons: CompetitiveDelta[] = [];

  for (const promptRun of promptRuns) {
    const answers = await createAnswersForPromptRun(promptRun, brandIds);
    allAnswers.push(...answers);
    const comparison = await judgeComparativeOutputs({ promptRun, answers });
    store.comparisons.push(comparison);
    comparisons.push(comparison);
  }

  return { promptRuns, answers: allAnswers, comparisons };
}
