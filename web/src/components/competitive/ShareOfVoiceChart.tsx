import type { OverviewRow } from "../../types";
import type { CSSProperties } from "react";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/dashboard";

const BRAND_VARS = [
  "var(--brand-1)",
  "var(--brand-2)",
  "var(--brand-3)",
  "var(--brand-4)",
  "var(--brand-5)",
  "var(--brand-6)",
];

export function ShareOfVoiceChart({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  const sorted = [...rows].sort((a, b) => b.shareOfVoice - a.shareOfVoice);
  const max = Math.max(0.001, ...sorted.map((row) => row.shareOfVoice));

  return (
    <Section title="Share of voice" description="Comparative narrative weight across all 20 perception prompts.">
      <div className="grid gap-3">
        {sorted.map((row, idx) => (
          <div className="grid gap-1.5" key={row.brandId}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{label(row.brandId)}</span>
              <span className="tabular-nums text-muted-foreground">{(row.shareOfVoice * 100).toFixed(1)}%</span>
            </div>
            <Progress
              value={Math.max((row.shareOfVoice / max) * 100, 4)}
              style={{ "--primary": BRAND_VARS[idx % BRAND_VARS.length] } as CSSProperties}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
