import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BusinessProfile, CitedSource, SourcesResponse } from "../types";

function sourceBadge(type: CitedSource["sourceType"]) {
  const map: Record<CitedSource["sourceType"], string> = {
    reddit: "Reddit",
    publication: "News",
    review: "Review",
    video: "YouTube",
    wiki: "Wiki",
    other: "Other",
  };
  return map[type];
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export function SourcesPage({ profile }: { profile: BusinessProfile }) {
  const [sources, setSources] = useState<CitedSource[]>([]);
  const [provider, setProvider] = useState("");
  const [type, setType] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSources([]);
    setError("");
    setLoading(true);
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (type) params.set("sourceType", type);
    if (sentiment) params.set("sentiment", sentiment);
    fetch(`${API_BASE}/business-profiles/${profile.id}/sources?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load source attributions."))))
      .then((body: SourcesResponse) => setSources(body.sources))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load source attributions."))
      .finally(() => setLoading(false));
  }, [profile.id, provider, type, sentiment]);

  if (loading) {
    return (
      <Card className="wide-panel">
        <CardHeader>
          <CardDescription>Sources</CardDescription>
          <CardTitle>Loading source attributions…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (sources.length === 0 && !provider && !type && !sentiment) {
    return (
      <Card className="wide-panel">
        <CardHeader>
          <CardDescription>Sources</CardDescription>
          <CardTitle>No source attributions for {profile.name} yet</CardTitle>
        </CardHeader>
        <CardContent>
        {error && <p className="error">{error}</p>}
        <p>
          Run a live benchmark with citation tracking enabled to surface the third-party sources AI assistants
          cite when answering about this brand.
        </p>
        </CardContent>
      </Card>
    );
  }

  const totalCitations = sources.reduce((acc, s) => acc + s.citationsThisWeek, 0);
  const reddit = sources
    .filter((s) => s.sourceType === "reddit")
    .reduce((acc, s) => acc + s.citationsThisWeek, 0);
  const newsAndReviews = sources
    .filter((s) => s.sourceType === "publication" || s.sourceType === "review")
    .reduce((acc, s) => acc + s.citationsThisWeek, 0);

  return (
    <Card className="wide-panel">
      <CardHeader>
        <CardDescription>Sources</CardDescription>
        <CardTitle>What AI cites about {profile.name}</CardTitle>
        <CardDescription>
          The third-party sources frontier models reach for when answering questions about this brand.
          Counts are citations across the last 7 days of monitoring runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {error && <p className="error">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <NativeSelect aria-label="Filter sources by provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="">All providers</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Claude</option>
          <option value="gemini">Gemini</option>
        </NativeSelect>
        <NativeSelect aria-label="Filter sources by type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All source types</option>
          <option value="reddit">Reddit</option>
          <option value="publication">News</option>
          <option value="review">Reviews</option>
          <option value="video">Video</option>
          <option value="wiki">Wiki</option>
          <option value="other">Other</option>
        </NativeSelect>
        <NativeSelect aria-label="Filter sources by sentiment" value={sentiment} onChange={(event) => setSentiment(event.target.value)}>
          <option value="">All sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </NativeSelect>
      </div>

      <div className="stat-row">
        <SummaryCard label="Citations / week" value={totalCitations} />
        <SummaryCard label="Reddit" value={reddit} />
        <SummaryCard label="News & reviews" value={newsAndReviews} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead className="w-[12%]">Type</TableHead>
            <TableHead className="w-[26%]">Brands mentioned</TableHead>
            <TableHead className="w-[14%]">Sentiment</TableHead>
            <TableHead className="w-[10%] text-right">Citations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="whitespace-normal">
                <div className="sources-row__title"><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></div>
                <div className="sources-row__domain">{s.domain}</div>
                <div className="muted">{s.providers.join(", ")} · {s.relatedRecommendationIds.length} related actions</div>
              </TableCell>
              <TableCell><Badge variant="secondary">{sourceBadge(s.sourceType)}</Badge></TableCell>
              <TableCell className="whitespace-normal">{s.brandsMentioned.join(", ")}</TableCell>
              <TableCell>
                <Badge variant={s.sentiment === "negative" ? "destructive" : s.sentiment === "positive" ? "default" : "outline"}>
                  {s.sentiment}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">{s.citationsThisWeek}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </CardContent>
    </Card>
  );
}
