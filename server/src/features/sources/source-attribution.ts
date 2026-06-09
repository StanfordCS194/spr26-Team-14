import type { BusinessProfile } from "../../db/business-profiles";
import { businessProfiles } from "../../db/business-profiles";
import type { MonitoringAttempt, MonitoringProvider } from "../../db/monitoring-runs";
import { profileRecommendations } from "../../db/profile-recommendations";
import { sourceCitations, type SourceType } from "../../db/source-citations";

const reviewDomains = ["g2.com", "capterra.com", "trustpilot.com", "consumerreports.org", "rottentomatoes.com"];

export function normalizeSourceUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["fbclid", "gclid", "ref"].includes(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function sourceType(domain: string): SourceType {
  if (domain === "reddit.com" || domain.endsWith(".reddit.com")) return "reddit";
  if (domain === "youtube.com" || domain === "youtu.be") return "video";
  if (domain === "wikipedia.org" || domain.endsWith(".wikipedia.org")) return "wiki";
  if (reviewDomains.some((review) => domain === review || domain.endsWith(`.${review}`))) return "review";
  return domain ? "publication" : "other";
}

export function recordAttemptSources(profile: BusinessProfile, attempt: MonitoringAttempt) {
  if (attempt.status !== "success" || !attempt.mentionSentiment) return [];
  const brands = [profile.name, ...businessProfiles.competitors(profile.id)].filter(
    (brand) => attempt.rawResponse?.toLowerCase().includes(brand.toLowerCase()),
  );
  return attempt.sources.flatMap((value) => {
    try {
      const canonicalUrl = normalizeSourceUrl(value);
      const domain = new URL(canonicalUrl).hostname;
      return [sourceCitations.add({
        businessProfileId: profile.id,
        monitoringAttemptId: attempt.id,
        monitoringPromptId: attempt.monitoringPromptId,
        provider: attempt.provider,
        url: value,
        canonicalUrl,
        domain,
        sourceType: sourceType(domain),
        sentiment: attempt.mentionSentiment!,
        brandsMentioned: brands,
        createdAt: attempt.createdAt,
      })];
    } catch {
      return [];
    }
  });
}

export function aggregateSources(
  profile: BusinessProfile,
  filters: {
    provider?: MonitoringProvider;
    sourceType?: SourceType;
    sentiment?: "positive" | "neutral" | "negative";
    windowDays?: number;
  } = {},
) {
  const windowStart = Date.now() - (filters.windowDays ?? 7) * 24 * 60 * 60 * 1000;
  const citations = sourceCitations.list(profile.id).filter(
    (citation) =>
      new Date(citation.createdAt).getTime() >= windowStart &&
      (!filters.provider || citation.provider === filters.provider) &&
      (!filters.sourceType || citation.sourceType === filters.sourceType) &&
      (!filters.sentiment || citation.sentiment === filters.sentiment),
  );
  const groups = new Map<string, typeof citations>();
  for (const citation of citations) {
    const group = groups.get(citation.canonicalUrl) ?? [];
    group.push(citation);
    groups.set(citation.canonicalUrl, group);
  }
  const recommendations = profileRecommendations.list(profile.id);

  return [...groups.entries()].map(([canonicalUrl, grouped]) => {
    const first = grouped[0]!;
    const providers = [...new Set(grouped.map((citation) => citation.provider))];
    const brandsMentioned = [...new Set(grouped.flatMap((citation) => citation.brandsMentioned))];
    const relatedRecommendationIds = recommendations
      .filter((recommendation) =>
        recommendation.category === "earned_media" ||
        (recommendation.targetProvider && providers.includes(recommendation.targetProvider as MonitoringProvider))
      )
      .map((recommendation) => recommendation.id);
    return {
      id: canonicalUrl,
      brandId: profile.id,
      url: canonicalUrl,
      domain: first.domain,
      title: new URL(canonicalUrl).pathname === "/" ? first.domain : new URL(canonicalUrl).pathname,
      citationsThisWeek: grouped.length,
      brandsMentioned,
      sentiment: first.sentiment,
      sourceType: first.sourceType,
      providers,
      monitoringPromptIds: [...new Set(grouped.map((citation) => citation.monitoringPromptId))],
      relatedRecommendationIds,
      createdAt: first.createdAt,
    };
  }).sort((a, b) => b.citationsThisWeek - a.citationsThisWeek || a.domain.localeCompare(b.domain));
}
