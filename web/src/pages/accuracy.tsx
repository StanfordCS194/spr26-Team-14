import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section, Stat, StatRow } from "@/components/dashboard";
import type {
  AccuracyAlert,
  AccuracySummary,
  BusinessProfile,
  CitationProviderSummary,
} from "../types";

const emptySummary: AccuracySummary = {
  responsesChecked: 0,
  totalClaims: 0,
  citedClaims: 0,
  citationCoverage: 1,
};

function percentage(value: number | null, claims: number) {
  return value === null || claims === 0 ? "—" : `${Math.round(value * 100)}%`;
}

export function AccuracyPage({ profile }: { profile: BusinessProfile }) {
  const [alerts, setAlerts] = useState<AccuracyAlert[]>([]);
  const [summary, setSummary] = useState<AccuracySummary>(emptySummary);
  const [providers, setProviders] = useState<CitationProviderSummary[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts`);
    if (!res.ok) throw new Error("Could not load citation evidence.");
    const body = await res.json();
    setAlerts(body.alerts);
    setSummary(body.summary);
    setProviders(body.providers);
  }

  useEffect(() => {
    setAlerts([]);
    setSummary(emptySummary);
    setProviders([]);
    setError("");
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load citation evidence."));
  }, [profile.id]);

  async function acknowledge(alertId: string) {
    const res = await fetch(`${API_BASE}/business-profiles/${profile.id}/accuracy-alerts/${alertId}/acknowledge`, {
      method: "PUT",
    });
    if (res.ok) await load();
  }

  const openAlerts = alerts.filter((alert) => alert.status === "open");

  return (
    <div className="grid gap-8">
      <StatRow>
        <Stat label="Responses audited" value={summary.responsesChecked} />
        <Stat label="Claims with sources" value={`${summary.citedClaims} / ${summary.totalClaims}`} />
        <Stat label="Citation coverage" value={percentage(summary.citationCoverage, summary.totalClaims)} />
      </StatRow>

      <Section
        title="Evidence coverage by provider"
        description="A citation makes a claim traceable, not automatically true. This audit checks whether each factual claim has an inline source; source quality and contradictions still require review."
      >
        <Table>
          <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Responses</TableHead><TableHead>Sourced claims</TableHead><TableHead>Coverage</TableHead></TableRow></TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.provider}>
                <TableCell>{provider.provider}</TableCell>
                <TableCell>{provider.responsesChecked}</TableCell>
                <TableCell>{provider.citedClaims} / {provider.totalClaims}</TableCell>
                <TableCell>{percentage(provider.citationCoverage, provider.totalClaims)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Unsupported factual claims">
        {openAlerts.length === 0 ? (
          <p className="muted">
            {summary.responsesChecked === 0
              ? "No responses have been audited yet. Run monitoring or a benchmark first."
              : "Every audited factual claim currently has an inline source."}
          </p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Risk</TableHead><TableHead>Claim without a source</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {openAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.provider}</TableCell>
                  <TableCell><Badge variant={alert.severity === "high" ? "destructive" : "outline"}>{alert.severity}</Badge></TableCell>
                  <TableCell className="whitespace-normal">{alert.claimText}</TableCell>
                  <TableCell><Button type="button" size="sm" variant="outline" onClick={() => acknowledge(alert.id)}>Acknowledge</Button></TableCell>
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
