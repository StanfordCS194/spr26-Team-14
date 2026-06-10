import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Section } from "@/components/dashboard";
import { PlayIcon, PlusCircleIcon } from "@/components/app-icons";

export type BenchmarkProvider = "openai" | "anthropic" | "gemini";

export interface CompetitiveSetInput {
  accountBrandName: string;
  competitorNames: string[];
  provider: BenchmarkProvider;
  model: string;
}

interface Props {
  onCreate: (input: CompetitiveSetInput) => Promise<void>;
  accountBrandName?: string;
  busy?: boolean;
  competitorNames?: string[];
  onSave?: (names: string[]) => Promise<void>;
}

/** Demo cohort: Netflix vs five major streaming competitors */
const DEFAULT_ACCOUNT = "Netflix";
const DEFAULT_COMPETITORS = ["Disney+", "Max", "Amazon Prime Video", "Apple TV+", "Paramount+"];

const PROVIDER_LABELS: Record<BenchmarkProvider, string> = {
  openai: "OpenAI",
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini",
};

const BENCHMARK_MODELS: Record<BenchmarkProvider, Array<{ label: string; value: string }>> = {
  openai: [
    { label: "GPT-4.1 mini", value: "gpt-4.1-mini" },
    { label: "GPT-5.5", value: "gpt-5.5" },
    { label: "GPT-5", value: "gpt-5" },
  ],
  anthropic: [
    { label: "Claude Opus 4.5", value: "claude-opus-4-5" },
    { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5" },
  ],
  gemini: [
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  ],
};

export function CompetitiveSetPicker({
  accountBrandName: initialAccountBrandName = DEFAULT_ACCOUNT,
  busy,
  competitorNames: savedCompetitors,
  onCreate,
  onSave,
}: Props) {
  const [accountBrandName, setAccountBrandName] = useState(initialAccountBrandName);
  const [competitorNames, setCompetitorNames] = useState<string[]>(savedCompetitors ?? DEFAULT_COMPETITORS);
  const [provider, setProvider] = useState<BenchmarkProvider>("openai");
  const [model, setModel] = useState(BENCHMARK_MODELS.openai[0]!.value);

  useEffect(() => setAccountBrandName(initialAccountBrandName), [initialAccountBrandName]);
  useEffect(() => setCompetitorNames(savedCompetitors ?? DEFAULT_COMPETITORS), [savedCompetitors]);

  const canSubmit = useMemo(() => {
    return accountBrandName.trim().length > 0 && competitorNames.every((name) => name.trim().length > 0);
  }, [accountBrandName, competitorNames]);

  return (
    <Section
      title="Competitive set"
      description="Pick your brand and five competitors. We'll fan twenty perception prompts across every brand and compare the answers."
      action={<Badge variant="secondary">5 competitors</Badge>}
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="account-brand">Your brand</Label>
          <Input
            id="account-brand"
            value={accountBrandName}
            onChange={(e) => setAccountBrandName(e.target.value)}
            placeholder="e.g. Netflix"
            spellCheck={false}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {competitorNames.map((name, idx) => (
            <div className="grid gap-2" key={idx}>
              <Label htmlFor={`competitor-${idx}`} className="flex items-center gap-2">
                <Badge variant="outline" className="picker__num size-5 rounded-full p-0">{idx + 1}</Badge>
                Competitor
              </Label>
              <Input
                id={`competitor-${idx}`}
                value={name}
                onChange={(e) => {
                  const next = [...competitorNames];
                  next[idx] = e.target.value;
                  setCompetitorNames(next);
                }}
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="benchmark-provider">Provider</Label>
            <NativeSelect
              id="benchmark-provider"
              className="w-full"
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as BenchmarkProvider;
                setProvider(nextProvider);
                setModel(BENCHMARK_MODELS[nextProvider][0]!.value);
              }}
              disabled={busy}
            >
              {(Object.keys(PROVIDER_LABELS) as BenchmarkProvider[]).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {PROVIDER_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="benchmark-model">Model</Label>
            <NativeSelect
              id="benchmark-model"
              className="w-full"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={busy}
            >
              {BENCHMARK_MODELS[provider].map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames, provider, model })}
            disabled={!canSubmit || busy}
          >
            <PlayIcon data-icon="inline-start" />
            {busy ? "Running benchmark…" : "Run benchmark"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSave?.(competitorNames)}
            disabled={!canSubmit || busy || !onSave}
          >
            <PlusCircleIcon data-icon="inline-start" />
            Save competitors
          </Button>
          {busy && (
            <span className="text-sm text-muted-foreground">
              Streaming brand summaries and judge comparisons in parallel.
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}
