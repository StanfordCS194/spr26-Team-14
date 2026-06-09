import type { OverviewRow } from "../../types";
import { Section } from "@/components/dashboard";

export function SentimentComparison({
  rows,
  brandLabels,
}: {
  rows: OverviewRow[];
  brandLabels?: Record<string, string>;
}) {
  const label = (id: string) => brandLabels?.[id] ?? id;
  const sorted = [...rows].sort((a, b) => b.sentiment - a.sentiment);

  return (
    <Section title="Sentiment" description="Where each brand sits on a -1 to +1 valence axis.">
      <div className="grid gap-3">
        {sorted.map((row) => {
          const pct = ((row.sentiment + 1) / 2) * 100;
          const tone =
            row.sentiment >= 0.25
              ? "var(--success)"
              : row.sentiment <= -0.25
                ? "var(--danger)"
                : "var(--ink)";
          return (
            <div className="grid gap-1.5" key={row.brandId}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{label(row.brandId)}</span>
                <span className="tabular-nums" style={{ color: tone }}>
                  {row.sentiment.toFixed(2)}
                </span>
              </div>
              <span className="sentiment-gauge" aria-hidden="true">
                <span className="sentiment-gauge__pin" style={{ left: `${pct}%`, background: tone }} />
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
