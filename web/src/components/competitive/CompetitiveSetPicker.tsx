import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayIcon, PlusCircleIcon } from "@/components/app-icons";

interface Props {
  onCreate: (input: { accountBrandName: string; competitorNames: string[] }) => Promise<void>;
  accountBrandName?: string;
  busy?: boolean;
  competitorNames?: string[];
  onSave?: (names: string[]) => Promise<void>;
}

/** Demo cohort: Netflix vs five major streaming competitors */
const DEFAULT_ACCOUNT = "Netflix";
const DEFAULT_COMPETITORS = ["Disney+", "Max", "Amazon Prime Video", "Apple TV+", "Paramount+"];

export function CompetitiveSetPicker({
  accountBrandName: initialAccountBrandName = DEFAULT_ACCOUNT,
  busy,
  competitorNames: savedCompetitors,
  onCreate,
  onSave,
}: Props) {
  const [accountBrandName, setAccountBrandName] = useState(initialAccountBrandName);
  const [competitorNames, setCompetitorNames] = useState<string[]>(savedCompetitors ?? DEFAULT_COMPETITORS);

  useEffect(() => setAccountBrandName(initialAccountBrandName), [initialAccountBrandName]);
  useEffect(() => setCompetitorNames(savedCompetitors ?? DEFAULT_COMPETITORS), [savedCompetitors]);

  const canSubmit = useMemo(() => {
    return accountBrandName.trim().length > 0 && competitorNames.every((name) => name.trim().length > 0);
  }, [accountBrandName, competitorNames]);

  return (
    <Card className="wide-panel border-border/70">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Competitive set</CardTitle>
          <Badge variant="secondary">5 competitors</Badge>
        </div>
        <CardDescription>
          Pick your brand and five competitors. We&rsquo;ll fan twenty perception prompts across every brand and
          compare the answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => onCreate({ accountBrandName: accountBrandName.trim(), competitorNames })}
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
      </CardContent>
    </Card>
  );
}
