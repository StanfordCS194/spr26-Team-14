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
  {
    id: "rec-6",
    title: "Win the 'best for documentaries' assistant answer",
    category: "content",
    impact: "medium",
    effort: "medium",
    evidence:
      "On documentary prompts, Max and Apple TV+ edge Netflix on citation frequency; Netflix is described as 'has docs' rather than 'best catalogue'.",
    action:
      "Refresh editorial hubs for true-crime and nature verticals with critic pull-quotes and laurels. Add an 'award-winning documentaries' landing page with JSON-LD ItemList.",
  },
  {
    id: "rec-7",
    title: "Repair latency narrative vs Amazon on reliability",
    category: "earned_media",
    impact: "high",
    effort: "medium",
    evidence:
      "Buffering and outage prompts skew negative for Netflix (0.22 sentiment) while Prime Video is framed as 'AWS-stable' despite mixed consumer reality.",
    action:
      "Publish a quarterly 'streaming reliability' report with third-party metrics and regional CDN stats. Place a story with Protocol or Ars citing methodology, not slogans.",
  },
  {
    id: "rec-8",
    title: "Surface Games in chatbot answers",
    category: "technical",
    impact: "low",
    effort: "medium",
    evidence:
      "Mobile-gaming prompts rarely mention Netflix Games; respondents default to Apple Arcade and Xbox Cloud.",
    action:
      "Expose a public sitemap and FAQ for the games catalogue, controller support, and offline rules. Add schema.org SoftwareApplication entries for top titles.",
  },
  {
    id: "rec-9",
    title: "Challenge Paramount+ on legacy franchise recall",
    category: "content",
    impact: "medium",
    effort: "high",
    evidence:
      "Star Trek and Yellowstone family prompts pull Paramount+ first; Netflix originals lack 'franchise gravity' in model summaries.",
    action:
      "Commission a long-read on how Netflix built sustained IP (Stranger Things universe, Bridgerton) vs licensed legacy. Target entertainment trades and Rolling Stone.",
  },
  {
    id: "rec-10",
    title: "Own the password-sharing pivot in plain language",
    category: "content",
    impact: "high",
    effort: "low",
    evidence:
      "Household and sharing prompts still echo outdated 'free sharing' framing; competitor answers are clearer on current policy.",
    action:
      "Ship a single canonical help URL on household rules, traveller mode, and extra member pricing. Mirror the same wording on regional marketing pages.",
  },
  {
    id: "rec-11",
    title: "Lift Korean and APAC prestige cues in English press",
    category: "earned_media",
    impact: "medium",
    effort: "high",
    evidence:
      "K-drama excellence prompts cite Disney+ and local apps as often as Netflix outside Asia; Squid Game halo has faded in model weights.",
    action:
      "Package a 'state of K-content' press kit with viewership context (no fabricated numbers). Brief APAC bureaus at Reuters and FT for one enterprise feature.",
  },
  {
    id: "rec-12",
    title: "Clarify ads tier in comparison tables",
    category: "technical",
    impact: "medium",
    effort: "low",
    evidence:
      "Price-comparison prompts mis-state Netflix ad-tier resolution caps and concurrent streams vs Hulu and Disney+ ad tiers.",
    action:
      "Publish a machine-readable pricing matrix (versioned JSON) and link it from the Ads plan page. Update meta descriptions to match the JSON literals.",
  },
  {
    id: "rec-13",
    title: "Counter HBO Max on 'watercooler' appointment TV",
    category: "earned_media",
    impact: "high",
    effort: "medium",
    evidence:
      "Sunday-night prestige prompts lean HBO Max / Max for cultural moment; Netflix weekly drops are framed as 'binge-only'.",
    action:
      "Run a tight earned cycle around simultaneous global release beats and watch-party integrations. Seed 5 TV-critic podcasts with episode-drop talking points.",
  },
  {
    id: "rec-14",
    title: "Improve download and offline claims accuracy",
    category: "content",
    impact: "low",
    effort: "low",
    evidence:
      "Travel and offline prompts overstate restrictions on Netflix vs Disney+; models cite stale help forum threads.",
    action:
      "Rewrite offline and travelling FAQs with country-specific bullets. Request recrawl of help URLs in Search Console.",
  },
  {
    id: "rec-15",
    title: "Win anime superfans from Crunchyroll overlap",
    category: "content",
    impact: "medium",
    effort: "high",
    evidence:
      "Hardcore anime prompts still privilege Crunchyroll for breadth; Netflix is summarized as 'dubbed mainstream picks'.",
    action:
      "Expand anime hub editorial with simulcast schedules, subtitling credits, and creator interviews. Sponsor two credible genre podcasts with episode chapters.",
  },
  {
    id: "rec-16",
    title: "Expose accessibility wins for voice assistants",
    category: "technical",
    impact: "low",
    effort: "medium",
    evidence:
      "Accessibility prompts rarely mention Netflix Audio Descriptions or subtitle customization versus Apple TV app defaults.",
    action:
      "Add an accessibility fact sheet page linked from footers (contrast, AD coverage, keyboard). Mark up with FAQPage schema citing WCAG-aligned features.",
  },
  {
    id: "rec-17",
    title: "Rebalance British period-drama association",
    category: "earned_media",
    impact: "low",
    effort: "medium",
    evidence:
      "UK heritage drama prompts overweight BBC iPlayer and BritBox; Bridgerton and The Crown are under-mentioned in composite answers.",
    action:
      "Pitch season-specific packages to British GQ, i, and Radio Times with costume-design and location economics angles.",
  },
  {
    id: "rec-18",
    title: "Tighten regional catalogue transparency",
    category: "technical",
    impact: "medium",
    effort: "high",
    evidence:
      "VPN and 'what's available in my country' prompts spread guesswork; competitors with clearer region pages win citations.",
    action:
      "Ship consistent region-picker copy on title detail pages and expose What's On JSON feeds per territory for partners.",
  },
  {
    id: "rec-19",
    title: "Defend comedy variety vs stand-up-only perception",
    category: "content",
    impact: "low",
    effort: "medium",
    evidence:
      "Comedy prompts equate Netflix with stand-up specials; sketch and rom-com breadth is omitted.",
    action:
      "Refresh comedy genre rails with hybrid formats and international titles. Add critic blurbs above the fold on hub pages.",
  },
  {
    id: "rec-20",
    title: "Reframe churn narrative with engagement proof points",
    category: "earned_media",
    impact: "high",
    effort: "high",
    evidence:
      "Subscriber churn prompts cite bearish headlines; LLMs latch onto earnings excerpts without time-on-service context.",
    action:
      "Offer an interview on retention mechanics to a credible finance outlet (not a puff piece). Anchor public remarks to verifiable engagement metrics only.",
  },
  {
    id: "rec-21",
    title: "Improve 'best streaming quality' technical comparability",
    category: "technical",
    impact: "medium",
    effort: "medium",
    evidence:
      "Bitrate and HDR prompts favor technical blog posts about competitors; Netflix codec story is thin in crawlable docs.",
    action:
      "Publish a codecs and adaptive streaming explainer with diagrams. Cross-link from device support articles.",
  },
  {
    id: "rec-22",
    title: "Lift reality TV discovery for unscripted prompts",
    category: "content",
    impact: "low",
    effort: "low",
    evidence:
      "Reality and dating-show comparisons cite Max and Peacock first; Love Is Blind and Selling Sunset lack structured synopses.",
    action:
      "Add concise machine-friendly summaries (cast, format, seasons) to hub pages for flagship reality IPs.",
  },
  {
    id: "rec-23",
    title: "Counter bundle confusion with Disney and Hulu",
    category: "earned_media",
    impact: "medium",
    effort: "medium",
    evidence:
      "Bundle prompts present Disney+/Hulu as default 'three-in-one'; Netflix plus add-ons is described as fragmented.",
    action:
      "Place an explanatory explainer with Reuters Connect or similar syndication on how Netflix add-ons map to households.",
  },
  {
    id: "rec-24",
    title: "Strengthen Hispanic and LATAM original citations",
    category: "earned_media",
    impact: "medium",
    effort: "high",
    evidence:
      "Spanish-language prestige prompts still anchor to traditional networks; Netflix LATAM originals are generic in model outputs.",
    action:
      "Run creator-led press junkets in Mexico City and Madrid with bilingual one-sheets. Target El País and regional TV verticals.",
  },
  {
    id: "rec-25",
    title: "Audit Wikipedia and Fandom parity for top ten IPs",
    category: "technical",
    impact: "low",
    effort: "high",
    evidence:
      "IP-specific prompts pull inconsistent franchise timelines from fan wikis; missing citations to primary Netflix pages.",
    action:
      "Coordinate good-faith sourcing improvements on key franchise articles with verifiable primary references—no astroturfing.",
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
  {
    id: "src-11",
    domain: "wired.com",
    title: "How every streamer is fighting for your attention in 2026",
    citationsThisWeek: 4,
    brandsMentioned: ["Netflix", "Apple TV+", "Disney+", "Max"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-12",
    domain: "reddit.com",
    title: "r/cordcutters · 'Dropping cable — which bundle is least painful?'",
    citationsThisWeek: 4,
    brandsMentioned: ["Netflix", "Amazon Prime Video", "Disney+", "Paramount+"],
    sentiment: "negative",
    sourceType: "reddit",
  },
  {
    id: "src-13",
    domain: "indiewire.com",
    title: "Sundance 2026: where the big streamers are buying",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Apple TV+", "Max"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-14",
    domain: "consumerreports.org",
    title: "Best on-demand streaming services of 2026",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Disney+", "Amazon Prime Video", "Apple TV+"],
    sentiment: "neutral",
    sourceType: "review",
  },
  {
    id: "src-15",
    domain: "youtube.com",
    title: "Linus Tech Tips · 'I tried every major streaming app for a week'",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Max", "Disney+", "Apple TV+"],
    sentiment: "neutral",
    sourceType: "video",
  },
  {
    id: "src-16",
    domain: "techcrunch.com",
    title: "Ad-supported tiers: who has the lightest ad load",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Max", "Disney+", "Amazon Prime Video"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-17",
    domain: "wikipedia.org",
    title: "Comparison of video streaming services",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Disney+", "Max", "Paramount+"],
    sentiment: "neutral",
    sourceType: "wiki",
  },
  {
    id: "src-18",
    domain: "hollywoodreporter.com",
    title: "Paramount+ and the race for legacy IP vs originals",
    citationsThisWeek: 2,
    brandsMentioned: ["Paramount+", "Netflix", "Disney+"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-19",
    domain: "reddit.com",
    title: "r/appletv · 'Is Severance the only reason to keep the sub?'",
    citationsThisWeek: 2,
    brandsMentioned: ["Apple TV+", "Netflix"],
    sentiment: "negative",
    sourceType: "reddit",
  },
  {
    id: "src-20",
    domain: "metacritic.com",
    title: "Best new streaming series · winter 2026",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Apple TV+", "Max"],
    sentiment: "positive",
    sourceType: "review",
  },
  {
    id: "src-21",
    domain: "variety.com",
    title: "Global subscribers: who's growing fastest post-price hikes",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Disney+", "Amazon Prime Video"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-22",
    domain: "youtube.com",
    title: "IndieWire · critics roundtable on streaming fatigue",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix", "Max", "Disney+"],
    sentiment: "negative",
    sourceType: "video",
  },
  {
    id: "src-23",
    domain: "arstechnica.com",
    title: "Why 4K streaming still doesn't look like the disc",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Apple TV+", "Amazon Prime Video"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-24",
    domain: "reddit.com",
    title: "r/television · 'Which service has the least annoying UI?'",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Max", "Disney+", "Apple TV+"],
    sentiment: "negative",
    sourceType: "reddit",
  },
  {
    id: "src-25",
    domain: "bloomberg.com",
    title: "Streaming profit margins after the password-sharing crackdown",
    citationsThisWeek: 3,
    brandsMentioned: ["Netflix", "Disney+", "Paramount+"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-26",
    domain: "polygon.com",
    title: "Game adaptations: from Halo to The Last of Us, who won 2025",
    citationsThisWeek: 2,
    brandsMentioned: ["Max", "Netflix", "Amazon Prime Video", "Paramount+"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-27",
    domain: "imdb.com",
    title: "Most popular streaming releases · user ratings spike",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Amazon Prime Video", "Disney+"],
    sentiment: "neutral",
    sourceType: "review",
  },
  {
    id: "src-28",
    domain: "youtube.com",
    title: "The Verge · 'Every streaming service, explained in 12 minutes'",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Apple TV+", "Max", "Disney+", "Paramount+"],
    sentiment: "neutral",
    sourceType: "video",
  },
  {
    id: "src-29",
    domain: "wikipedia.org",
    title: "Disney+",
    citationsThisWeek: 2,
    brandsMentioned: ["Disney+", "Netflix"],
    sentiment: "neutral",
    sourceType: "wiki",
  },
  {
    id: "src-30",
    domain: "engadget.com",
    title: "The best streaming devices to buy in 2026",
    citationsThisWeek: 2,
    brandsMentioned: ["Amazon Prime Video", "Netflix", "Apple TV+"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-31",
    domain: "slashfilm.com",
    title: "Franchise fatigue vs binge drops: what critics reward now",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Disney+", "Max"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-32",
    domain: "reddit.com",
    title: "r/Netflix · 'Honest ranking of regional libraries'",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Disney+"],
    sentiment: "neutral",
    sourceType: "reddit",
  },
  {
    id: "src-33",
    domain: "forbes.com",
    title: "The ad tier playbook: who's undercutting whom",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Max", "Amazon Prime Video"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-34",
    domain: "theguardian.com",
    title: "British versus US catalogue gaps on the big five streamers",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Disney+", "Apple TV+", "Amazon Prime Video"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-35",
    domain: "decider.com",
    title: "What to Watch this weekend — algorithm picks decoded",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Max", "Apple TV+"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-36",
    domain: "avclub.com",
    title: "Prestige TV is dead; long live whatever this is",
    citationsThisWeek: 2,
    brandsMentioned: ["Max", "Netflix", "Apple TV+"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-37",
    domain: "rollingstone.com",
    title: "Best music documentaries you can stream right now",
    citationsThisWeek: 2,
    brandsMentioned: ["Netflix", "Apple TV+", "Amazon Prime Video"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-38",
    domain: "youtube.com",
    title: "Wendover Productions · the economics of a blockbuster premiere",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix", "Amazon Prime Video", "Disney+"],
    sentiment: "neutral",
    sourceType: "video",
  },
  {
    id: "src-39",
    domain: "reddit.com",
    title: "r/AmazonPrimeVideo · 'Thursday Night Football vs cable'",
    citationsThisWeek: 1,
    brandsMentioned: ["Amazon Prime Video", "Paramount+", "Netflix"],
    sentiment: "positive",
    sourceType: "reddit",
  },
  {
    id: "src-40",
    domain: "collider.com",
    title: "Star Trek canon: where to stream every series in order",
    citationsThisWeek: 1,
    brandsMentioned: ["Paramount+", "Netflix"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-41",
    domain: "gamespot.com",
    title: "Fallout and beyond: videogame IP on streaming",
    citationsThisWeek: 1,
    brandsMentioned: ["Amazon Prime Video", "Max", "Netflix"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-42",
    domain: "mashable.com",
    title: "Password sharing rules, updated for every major service",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix", "Disney+", "Max", "Apple TV+"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-43",
    domain: "cnet.com",
    title: "How we test streaming quality (and why bitrates matter)",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix", "Amazon Prime Video", "Apple TV+"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-44",
    domain: "businessinsider.com",
    title: "Analyst note: churn spikes after bundle promos expire",
    citationsThisWeek: 1,
    brandsMentioned: ["Disney+", "Netflix", "Paramount+"],
    sentiment: "negative",
    sourceType: "publication",
  },
  {
    id: "src-45",
    domain: "wikipedia.org",
    title: "Max (streaming service)",
    citationsThisWeek: 1,
    brandsMentioned: ["Max", "Netflix", "Paramount+"],
    sentiment: "neutral",
    sourceType: "wiki",
  },
  {
    id: "src-46",
    domain: "reddit.com",
    title: "r/DisneyPlus · 'Is the bundle still cheaper than Netflix 4K?'",
    citationsThisWeek: 1,
    brandsMentioned: ["Disney+", "Netflix", "Max"],
    sentiment: "neutral",
    sourceType: "reddit",
  },
  {
    id: "src-47",
    domain: "youtube.com",
    title: "New Rockstars · Easter eggs in Stranger Things S5 trailer",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix"],
    sentiment: "positive",
    sourceType: "video",
  },
  {
    id: "src-48",
    domain: "screenrant.com",
    title: "Every MCU project coming to Disney+ in 2026",
    citationsThisWeek: 1,
    brandsMentioned: ["Disney+", "Netflix"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-49",
    domain: "dexerto.com",
    title: "Reality TV wars: Love Is Blind vs Selling Sunset territories",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix"],
    sentiment: "neutral",
    sourceType: "publication",
  },
  {
    id: "src-50",
    domain: "ign.com",
    title: "Best fantasy series to binge after House of the Dragon",
    citationsThisWeek: 1,
    brandsMentioned: ["Max", "Netflix", "Amazon Prime Video"],
    sentiment: "positive",
    sourceType: "publication",
  },
  {
    id: "src-51",
    domain: "tomsguide.com",
    title: "Netflix vs Max vs Disney+: codec and HDR compared",
    citationsThisWeek: 1,
    brandsMentioned: ["Netflix", "Max", "Disney+"],
    sentiment: "neutral",
    sourceType: "review",
  },
  {
    id: "src-52",
    domain: "espn.com",
    title: "Exclusive league deals reshaping who carries live sports",
    citationsThisWeek: 1,
    brandsMentioned: ["Amazon Prime Video", "Netflix", "Paramount+", "Disney+"],
    sentiment: "neutral",
    sourceType: "publication",
  },
];
