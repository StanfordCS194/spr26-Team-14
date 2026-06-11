import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section } from "@/components/dashboard";
import type { BenchmarkCitation, BusinessProfile } from "../types";

export function AccuracyPage({ profile }: { profile: BusinessProfile }) {
  const [benchmarkCitations, setBenchmarkCitations] = useState<BenchmarkCitation[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const citationsRes = await fetch(`${API_BASE}/business-profiles/${profile.id}/benchmark-citations`);
    if (!citationsRes.ok) throw new Error("Could not load citation evidence.");
    const citationsBody = await citationsRes.json();
    setBenchmarkCitations(citationsBody.citations ?? []);
  }

  useEffect(() => {
    setBenchmarkCitations([]);
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load citation evidence."));
  }, [profile.id]);

  return (
    <div className="grid gap-8">
      <Section
        title="Benchmark citations"
        description="Sources the benchmarking model attached to its comparative scoring. Each run is grounded in at least 25 cited claims."
      >
        {benchmarkCitations.length === 0 ? (
          <p className="muted">No benchmark citations yet. Run a competitive benchmark to ground its scoring in sources.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead>Grounded claim</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {benchmarkCitations.map((citation, index) => (
                <TableRow key={`${citation.promptRunId}-${index}`}>
                  <TableCell>{citation.brandName ?? "—"}</TableCell>
                  <TableCell className="whitespace-normal">{citation.claim}</TableCell>
                  <TableCell>
                    <a href={citation.url} target="_blank" rel="noreferrer" className="underline break-all">
                      {citation.url}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
