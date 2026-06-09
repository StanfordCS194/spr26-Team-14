import { businessProfiles } from "../src/db/business-profiles";
import { monitoringPrompts } from "../src/db/monitoring-prompts";

/**
 * Demo seed: pre-create a Netflix business profile with monitoring prompts +
 * saved competitor list, so all four sidebar sections have real content on
 * first paint without onboarding. Idempotent — looks for an existing Netflix
 * profile before inserting.
 */

const PROFILE_NAME = "Netflix";
const PROFILE_WEBSITE = "https://www.netflix.com";
const PROFILE_DESCRIPTION =
  "Streaming entertainment service with 260M+ paid memberships in over 190 countries. Originals across film, series, documentaries, and games.";

const SAVED_COMPETITORS = ["Disney+", "Max", "Amazon Prime Video", "Apple TV+", "Paramount+"];

const MONITORING_PROMPTS: ReadonlyArray<string> = [
  "What is the best streaming service for movies and TV shows in 2026?",
  "Compare Netflix vs Disney+ for families with young kids.",
  "Which streaming service has the best original content right now?",
  "Is Netflix worth it if I already have Amazon Prime?",
  "What streaming service has the best live sports coverage?",
  "Best streaming service with no ads at the cheapest price?",
  "Which streaming platform releases the most prestige TV series?",
  "What is the best streaming service for K-dramas and Korean content?",
  "Should I cancel Netflix? What are the best alternatives in 2026?",
  "Compare the ad-supported tiers on Netflix, Max, and Disney+.",
  "Which streaming service has the largest film library?",
  "Best streaming service for binge-watching original drama series?",
];

const DEMO_SENTIMENT_HISTORY = [0.62, 0.68, 0.58, 0.74, 0.71, 0.79, 0.76] as const;

export interface ProfileSeedSummary {
  created: boolean;
  profileId: string;
  monitoringCount: number;
  monitoringHistoryCount: number;
}

function sentimentForScore(score: number) {
  if (score >= 0.2) return "positive" as const;
  if (score <= -0.2) return "negative" as const;
  return "neutral" as const;
}

function ensureDemoMonitoringHistory(profileId: string) {
  if (monitoringPrompts.resultCount(profileId) > 0) {
    return monitoringPrompts.results(profileId).length;
  }

  let prompts = monitoringPrompts.list(profileId);
  if (prompts.length === 0) {
    prompts = monitoringPrompts.replaceAll(profileId, [...MONITORING_PROMPTS]);
  }

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  DEMO_SENTIMENT_HISTORY.forEach((score, index) => {
    const createdAt = new Date(today);
    createdAt.setUTCDate(today.getUTCDate() - (DEMO_SENTIMENT_HISTORY.length - 1 - index));
    const prompt = prompts[index % prompts.length]!;
    monitoringPrompts.addResult({
      businessProfileId: profileId,
      monitoringPromptId: prompt.id,
      score,
      mentionSentiment: sentimentForScore(score),
      answerSummary: "Seeded demo trend point for the 7-day monitoring graph.",
      sources: [],
      createdAt: createdAt.toISOString(),
    });
  });

  return DEMO_SENTIMENT_HISTORY.length;
}

export function loadNetflixProfileSeed(): ProfileSeedSummary {
  const existing = businessProfiles.list().find((profile) => profile.name === PROFILE_NAME);
  if (existing) {
    const monitoringHistoryCount = ensureDemoMonitoringHistory(existing.id);
    return {
      created: false,
      profileId: existing.id,
      monitoringCount: monitoringPrompts.list(existing.id).length,
      monitoringHistoryCount,
    };
  }

  const profile = businessProfiles.create({
    name: PROFILE_NAME,
    website: PROFILE_WEBSITE,
    description: PROFILE_DESCRIPTION,
  });
  businessProfiles.saveCompetitors(profile.id, [...SAVED_COMPETITORS]);
  monitoringPrompts.replaceAll(profile.id, [...MONITORING_PROMPTS]);
  monitoringPrompts.setStatus(profile.id, "ready");
  const monitoringHistoryCount = ensureDemoMonitoringHistory(profile.id);

  return {
    created: true,
    profileId: profile.id,
    monitoringCount: MONITORING_PROMPTS.length,
    monitoringHistoryCount,
  };
}
