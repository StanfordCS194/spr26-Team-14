/**
 * Centralized demo content for the seeded Netflix brand. Powers the
 * Recommendations and Sources sections so every sidebar tab has real
 * content on first paint without requiring a benchmark run.
 *
 * Tied to the streaming cohort seeded server-side in
 * `server/seed/streaming.ts`. If the active business profile name does not
 * match `DEMO_BRAND_NAME`, page components fall back to an empty state.
 */

export const DEMO_BRAND_NAME = "Netflix";

export type RecommendationCategory = "content" | "earned_media" | "technical";
export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  title: string;
  category: RecommendationCategory;
  impact: ImpactLevel;
  effort: EffortLevel;
  evidence: string;
  action: string;
}

export const NETFLIX_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-1",
    title: "Reclaim the value narrative from Amazon Prime",
    category: "content",
    impact: "high",
    effort: "medium",
    evidence:
      "Amazon Prime owns 34% share-of-voice on the value-for-money prompt; Netflix is at 13% with neutral sentiment. Bundling and the ads-tier story aren't landing in AI answers.",
    action:
      "Publish a comparison page that explicitly addresses 'Netflix vs Amazon Prime: what you actually pay for' with hard prices and per-show CPMs. Pitch one Verge or Wired piece quoting these numbers.",
  },
  {
    id: "rec-2",
    title: "Counter Apple TV+ on the innovation narrative",
    category: "earned_media",
    impact: "high",
    effort: "high",
    evidence:
      "Apple TV+ holds 36% share-of-voice on the most-innovative prompt with a +0.65 sentiment, the highest in the cohort. Netflix's prestige originals (Stranger Things, The Crown) aren't getting cited as 'innovative'.",
    action:
      "Brief 3 critic-press contacts (NYT, Vulture, IndieWire) on the technical innovation behind Squid Game S2 and 3 Body Problem — VFX pipeline, simul-release infrastructure. Frame Netflix as the platform that scales prestige.",
  },
  {
    id: "rec-3",
    title: "Plant a flag in live-sports whitespace",
    category: "content",
    impact: "medium",
    effort: "high",
    evidence:
      "No streaming brand owns the consensus answer on live-sports prompts. Amazon Prime Video and Paramount+ split the small share that exists.",
    action:
      "Lean into the NFL Christmas slate and WWE Raw deal in next quarter's PR cycle. Get a 'Netflix is now a sports destination' op-ed placed in The Athletic or Sports Business Journal.",
  },
  {
    id: "rec-4",
    title: "Claim the recommendations-engine narrative",
    category: "technical",
    impact: "medium",
    effort: "low",
    evidence:
      "Netflix's recommendation engine surfaces in only 4 of 20 prompts despite being the historical brand pillar. AI assistants default to 'large library' rather than 'best discovery'.",
    action:
      "Update the help center and About page with discoverability-focused copy. Add structured data (FAQ schema) on the Top 10 lists so chatbots can cite per-country recommendations directly.",
  },
  {
    id: "rec-5",
    title: "Defend on the family-friendly narrative",
    category: "earned_media",
    impact: "low",
    effort: "low",
    evidence:
      "Disney+ owns 21% share-of-voice on family prompts vs Netflix at 9%. Disney's IP advantage is structural, but Netflix's kids slate (CoComelon, Gabby's Dollhouse) isn't getting cited.",
    action:
      "Sponsor 2-3 family-influencer reviews on YouTube with structured 'best for ages 4-8' framing. AI chatbots cite YouTube transcripts heavily.",
  },
];

export type SourceType = "reddit" | "publication" | "review" | "video" | "wiki";
export type CitedSentiment = "positive" | "neutral" | "negative";

export interface CitedSource {
  id: string;
  domain: string;
  title: string;
  citationsThisWeek: number;
  brandsMentioned: string[];
  sentiment: CitedSentiment;
  sourceType: SourceType;
}

export const NETFLIX_SOURCES: CitedSource[] = [
  {
    id: "src-1",
    domain: "reddit.com",
    title: "r/television · 'Best streaming service for 2026?'",
    citationsThisWeek: 14,
    brandsMentioned: ["Netflix", "Disney+", "Max", "Apple TV+"],
    sentiment: "neutral",
    sourceType: "reddit",
  },
  {
    id: "src-2",
    domain: "theverge.com",
    title: "Streaming wars 2026: who's winning the prestige race",
    citationsThisWeek: 9,
    brandsMentioned: ["Apple TV+", "Max", "Netflix"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-3",
    domain: "nytimes.com",
    title: "What the Netflix Q4 numbers actually tell us",
    citationsThisWeek: 8,
    brandsMentioned: ["Netflix"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-4",
    domain: "reddit.com",
    title: "r/NetflixBestOf · weekly recommendation thread",
    citationsThisWeek: 7,
    brandsMentioned: ["Netflix"],
    sentiment: "positive",
    sourceType: "reddit",
  },
  {
    id: "src-5",
    domain: "youtube.com",
    title: "MarquesBrownlee · Apple TV+ review (Severance S2)",
    citationsThisWeek: 6,
    brandsMentioned: ["Apple TV+", "Netflix"],
    sentiment: "negative",
    sourceType: "video",
  },
  {
    id: "src-6",
    domain: "deadline.com",
    title: "Inside the streaming-bundle pricing war",
    citationsThisWeek: 6,
    brandsMentioned: ["Amazon Prime Video", "Disney+", "Max", "Netflix"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-7",
    domain: "rottentomatoes.com",
    title: "Top streaming picks · January 2026",
    citationsThisWeek: 5,
    brandsMentioned: ["Netflix", "Max", "Apple TV+"],
    sentiment: "positive",
    sourceType: "review",
  },
  {
    id: "src-8",
    domain: "wikipedia.org",
    title: "List of Netflix original programming",
    citationsThisWeek: 5,
    brandsMentioned: ["Netflix"],
    sentiment: "neutral",
    sourceType: "wiki",
  },
  {
    id: "src-9",
    domain: "reddit.com",
    title: "r/Sports · 'NFL Christmas Day on Netflix worth it?'",
    citationsThisWeek: 4,
    brandsMentioned: ["Netflix", "Amazon Prime Video", "Paramount+"],
    sentiment: "neutral",
    sourceType: "reddit",
  },
  {
    id: "src-10",
    domain: "vulture.com",
    title: "Why Netflix's catalogue still wins on volume",
    citationsThisWeek: 4,
    brandsMentioned: ["Netflix"],
    sentiment: "positive",
    sourceType: "publication",
  },
];
