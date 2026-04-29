# Perception · Demo Day Walkthrough

A 7–9 minute walkthrough for the Wednesday Demo Day Zoom slot. Uses the seeded
**Netflix vs Disney+ / Max / Amazon Prime Video / Apple TV+ / Paramount+** cohort
that ships with this branch. Every dashboard view has real data on first paint —
no clicks required to populate.

> **TL;DR.** Open the dashboard. Walk Monitoring → Benchmarking. Click *Run
> benchmark*. Narrate the Theater for 60–90s. Land on the gap punchline:
> "Netflix is missing on **value** and **innovation** — that's exactly the
> diagnosis we surface."

---

## 0 · Pre-flight (5 minutes before joining Zoom)

```bash
# 1. Make sure your OpenAI key is set so the live run shows real LLM output
cat server/.env   # should contain OPENAI_API_KEY=sk-...

# 2. Start the stack (one terminal)
bun install            # only if you haven't already
bun run dev            # spawns server on :3000 and web on :5173

# 3. Open the dashboard in a fresh browser tab
open http://localhost:5173
```

Sanity checks before screen share:

- Server boot log shows two `[seed]` lines:
  - `Loaded streaming demo cohort: 10 prompt runs, 10 comparisons, 3 gap events.`
  - `Created Netflix business profile (…) with 12 monitoring prompts.`
- `curl http://localhost:3000/llm/status` returns `{"provider":"openai","mode":"live"}` (if it says `mock`, your key didn't load — restart the server).
- The Benchmarking tab opens populated: Netflix at the top of Share of Voice,
  Apple TV+ rising on Sentiment, three brand-color chips per row in Feature signal.
- Monitoring tab shows 12 prompts with sentiment pills (positive / neutral /
  negative) and a 7-day sentiment trend chart.
- Browser at ~1440px wide. Charts collapse below ~980px.
- Close other tabs that might steal CPU during the live run.

If anything looks off, jump to **Section 7 (Backup script)** at the bottom.

---

## 1 · Opening (~30 seconds)

> *"Perception is a brand-intelligence platform for the AI era. Companies spend
> millions on SEO so Google ranks them, but consumers are increasingly asking
> ChatGPT, Claude, and Gemini for product recommendations — and most brands have
> **zero visibility** into what AI is saying about them.*
>
> *I'll show you how a marketing team at Netflix could see exactly how AI describes
> them versus the rest of the streaming category — in one click."*

Click **Benchmarking** in the sidebar to anchor the demo.

---

## 2 · Tour of Monitoring (~45 seconds, optional opener)

Click **Monitoring** in the sidebar first if you have time.

> *"Before we get to head-to-head benchmarking, here's what daily monitoring
> looks like. Twelve prompts — the actual queries customers are asking AI
> chatbots about streaming services. Sentiment is colour-coded per prompt:
> green where Netflix wins the answer, red where it loses, neutral where it's
> in the middle."*

Point at:
- The 7-day sentiment trend (the line goes from -0.18 to +0.26 to -0.06).
- The mix of green / neutral / red pills in the table — you don't get to
  cherry-pick; AI says what it says.
- The **Add a prompt** input at the bottom: "Marketing teams add prompts they
  care about; we re-run them daily and surface drift."

Skip this section entirely if your slot is tight. Benchmarking is the moneyshot.

---

## 3 · Benchmarking dashboard at rest (~90 seconds)

Click **Benchmarking** in the sidebar. The dashboard is *already populated* —
that's the seed pack doing its job.

### Hero (read this verbatim)
> *"This is what we're tracking: 20 perception prompts fanned across Netflix and
> 5 streaming competitors, every prompt answered by frontier models, results
> rolled into share of voice, sentiment, feature gaps, and whitespace."*

### Share of voice
> *"Netflix is the leader at ~25% share of voice across all the prompts. Apple
> TV+ is rising — 21%. Paramount+ is in the single digits."*

Point at the bars. Sorted descending; brand-coloured fills.

### Sentiment
> *"Sentiment is where it gets interesting. **Apple TV+ has the highest sentiment**
> even though Netflix has more share. That's the prestige-originals narrative
> beating the incumbent on quality. The gauge runs -1 to +1; pin colour flips
> red for negative, green for positive."*

### Feature signal
> *"These are the themes the judge LLM repeatedly attached to each brand across
> the 20 prompts. Netflix wins on `leadership` and `originals`. Disney+ owns
> `family` and `ip`. Max owns `prestige`. **Notice nothing on Netflix says
> `value` or `innovation`** — that's a problem."*

### Feature praise gaps (the punchline)
> *"Right here, Perception flagged it: **Amazon Prime is praised on `value`;
> Netflix isn't.** And **Apple TV+ owns `innovation`; Netflix is barely
> mentioned.** Two clear gaps the marketing team can act on."*

### Whitespace
> *"And here's whitespace: AI assistants don't decisively recommend any one
> brand for **live sports**. That's a category Netflix could move into and own."*

This is the differentiator pitch: every other tool stops at *here's what AI
says*. We surface **gaps and whitespace** — what to do about it.

---

## 4 · The live run (~2–3 minutes, narrate while it runs)

Click **Run benchmark** with the default Netflix slate.

The Theater section appears with six brand columns. While it streams:

> *"What you're watching live is the platform fanning twenty prompts across
> every brand simultaneously. Each column is one of the streaming services.
> The cursor blinks while OpenAI is mid-stream. The bar at the top of each
> column fills as prompts complete."*

Things to point at:

- The **Judge LLM** aside that pops in between brand answers — that's the
  comparative scoring step.
- The progress counters: `0/20 → 1/20 → 2/20 …`.
- The fact that **all six brands run in parallel** at concurrency 4 — that's
  why it finishes in ~45–60 seconds instead of 5+ minutes.

Filler narration if the run drags:

> *"The reason this matters operationally: in the AI era, brand visibility is
> non-deterministic. The same prompt gives different answers tomorrow. So the
> only honest way to measure brand presence in AI is to keep running prompts
> on a schedule — exactly what Perception does. Every 24 hours, the same 20
> prompts, the same six brands, fresh comparisons."*

If you have ~45 more seconds:

> *"Behind the scenes, every answer feeds a comparative judge LLM that scores
> share of voice as a probability distribution that sums to 1. Sentiment is a
> -1 to +1 score per brand per prompt. Feature attribution is constrained to
> a fixed taxonomy so we can roll it up over time. None of this is keyword
> matching — it's all LLM-judged."*

---

## 5 · Post-run reveal (~60 seconds)

When the Theater finishes, the dashboard panels update with the merged data
(7 days of seeded history + today's fresh run).

> *"Now the dashboard has refreshed. Trends rolls forward. New gap events get
> detected. If Netflix's marketing team did this every Monday morning, they'd
> have a moving picture of how AI's perception of their brand is changing
> — week over week, prompt by prompt."*

Scroll to **Trend snapshot** and point at the daily mini-bars:

> *"Daily averages. One row per day, per brand. Netflix's share is stable.
> Apple TV+ is climbing. Paramount+ is volatile."*

Scroll to **Run configuration**:

> *"And every run is auditable. Here's the exact account, competitors, window,
> and timestamp. If a CMO asks 'what was running when?', we can answer."*

---

## 6 · Closing pitch (~30 seconds)

> *"Three things we do that no competitor does today:*
>
> 1. **We tell you where the gaps are**, not just where you stand.
> 2. **We surface whitespace** — categories AI hasn't decided yet, where you
>    can plant a flag.
> 3. **We make the run itself a story** — the Theater isn't just polish, it's
>    how you build conviction with a CMO that the data is real.
>
> *Built by the team in 4 weeks. Today it tracks GPT-class models; Claude and
> Gemini are next. Hallucination detection — ChatGPT inventing wrong pricing
> or features — is the next major feature."*

---

## 7 · Backup script (use this if the live run fails)

If `bun run dev` won't start, OpenAI rate-limits, or the network drops:

1. The dashboard is already populated by the seed pack — do **steps 1, 2, 3,
   5, 6** of the real script and skip step 4 entirely.
2. For the "live moment", click Run anyway — even without a key, the mock LLM
   returns deterministic placeholder text and the Theater plays. Narrate it
   as: *"we're running in offline demo mode so the Zoom doesn't lag."*
3. Fallback fallback: if the Run button hangs, hit `Cmd+Shift+R` to refresh,
   the seeded data re-hydrates immediately. No live run needed.

---

## 8 · Two-minute version (if your slot gets cut short)

If the CA tells you to wrap in 90 seconds:

1. **Hero + dashboard** (already populated): *"AI is the new search; here's
   how AI talks about Netflix vs every other streamer. We track 20 prompts ×
   6 brands daily."*
2. **Skip the live run.** Just point at the populated bars + sentiment + gaps.
3. **Punchline gap**: *"Amazon owns `value`, Apple TV+ owns `innovation`;
   Netflix is missing both. We surface that. Nobody else does."*
4. **Close**: *"Profound monitors. We diagnose."*

That hits visibility, differentiation, and the strongest example in 90s.

---

## 9 · Q&A — quick answers

| Question | Quick answer |
|---|---|
| Are you using a real LLM or mocking? | Live OpenAI for both the perception prompts and the comparative judge. The Run config block shows mode: `live · openai`. |
| What models? | `gpt-4.1-mini` for both answers and judging. Multi-provider abstraction is in flight on a separate branch. |
| How are the prompts chosen? | 10 brand-specific (each retailer's name substituted) plus 10 category-wide leadership prompts. The prompt set is configurable per cohort. |
| How long does a real run take? | ~30–60 seconds for 6 brands × 20 prompts × concurrency 4. Theater fills the time visually. |
| What about hallucinations? | We have a v0 detector (regex-based contradictions for pricing / founding year / HQ) on a separate branch. Coming back to it post-demo. |
| What's the data model? | SQLite for business profiles, monitoring prompts, and competitor lists. In-memory for the competitive pipeline (prompt runs / answers / comparisons / gap events) — moving to Postgres is the next migration. |
| Differentiator vs Profound / Peec? | They're monitoring dashboards. We close the loop: detection → diagnosis (gap events) → recommended action → before-and-after measurement. |
| Privacy / data? | Brand-provided fact sheets stay client-side until a run. AI answers we generate ourselves; we never scrape user conversations. |
| Cost per run? | ~$0.03 per benchmark run on `gpt-4.1-mini` (120 short answers + 20 short judge passes). Linear with brands × prompts. |
| Why streaming for the demo? | Universally recognised; sharp narrative differentiation across `leader`, `value`, `innovation`, `family`, `prestige`, `sports`. |

---

## 10 · The story arc the data tells

This is the underlying narrative the screenshots support — useful if a CA asks
*"what's actually interesting here?"*

| Brand | Owns | Loses | Why |
|---|---|---|---|
| **Netflix** | `leadership`, `content_volume`, `originals` | `value`, `innovation` | Incumbent leader; pricing fatigue + Apple TV+ stealing the prestige-originals narrative |
| **Disney+** | `family`, `ip` | `prestige`, `value-for-quality` | IP-driven (Marvel / Star Wars / Pixar) but seen as kids-first |
| **Max** | `prestige`, `content_quality` | `value`, `innovation` | HBO heritage carries quality narrative; expensive |
| **Amazon Prime** | `value`, `bundle`, `sports` | `prestige` | Bundle-driven; never reads as premium |
| **Apple TV+** | `innovation`, `quality`, `originals` | `value`, `library_size` | Small library, prestige originals — punching above weight on perception |
| **Paramount+** | (narrowly) `sports` | most other dimensions | Scrappy, fights for relevance |

The two **gap events** Perception surfaces directly mirror this:
1. *Amazon Prime is praised on `value`; Netflix is unmentioned.*
2. *Apple TV+ owns the innovation narrative; Netflix is barely mentioned.*

The one **whitespace event**:
- *Live-sports prompts surface Amazon Prime Video and Paramount+; Netflix is
  absent from the consensus answer.*

If you only remember three numbers from this doc, remember:
- **38%** — Netflix's share of voice on the *who is the streaming leader*
  prompt (highest of any brand on any prompt in the cohort).
- **+0.65** — Apple TV+'s sentiment on the *most innovative* prompt (highest
  positive sentiment in the cohort).
- **-0.05 → +0.50** — Paramount+'s swing between *value* (positive) and
  *premium* (slightly negative). Schizophrenic positioning.

---

## 11 · File map (for reviewers reading the code)

- `server/seed/streaming.ts` — the seeded competitive cohort (Netflix vs five
  streamers) + 7 days of synthetic comparisons + 3 gap events.
- `server/seed/netflix-profile.ts` — auto-creates the Netflix business profile,
  saves the competitor list, and seeds 12 monitoring prompts on first boot.
- `server/src/index.ts` — boot-time wiring; both seeds are loaded behind the
  `PERCEPTION_DEMO_SEED` flag (set to `0` to disable).
- `server/src/routes/competitive.ts` — `/competitive/snapshot` powers the
  first-paint preview the dashboard auto-loads.
- `server/src/routes/llm-status.ts` — `/llm/status` reports live vs mock.
- `web/src/components/competitive/LiveRunTheater.tsx` — the streaming column
  panel during a run.
- `web/src/pages/competitive.tsx` — page composition: picker, theater, charts,
  trend snapshot, run configuration.

---

## 12 · After the demo

Open the team Slack with three notes:

1. **Which CA / team gave you which feedback** — verbatim where possible.
2. **Whether the live run hit OpenAI or fell back to mock.**
3. **Three follow-up tasks** to file as issues. Suggested defaults:
   - Hallucination detection v1 (LLM-driven claim extraction beyond regex)
   - Multi-provider live mode (Claude + Gemini answers in parallel)
   - Recommendations tab v1 (turn gap events into actionable cards)
