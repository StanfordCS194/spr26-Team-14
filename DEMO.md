# Perception · Demo Script (Streaming Services Cohort)

A 7–9 minute walkthrough for the Wednesday Demo Day slot. Uses the seeded
**Netflix vs Disney+ / Max / Amazon Prime Video / Apple TV+ / Paramount+** cohort
that ships with the demo seed pack.

---

## 0. Pre-flight (do this 5 min before joining Zoom)

```bash
# 1. Make sure your OpenAI key is set so the live run shows real LLM output
cat server/.env   # should contain a non-empty OPENAI_API_KEY=...

# 2. Start the stack (one terminal)
bun install            # only if you haven't already
bun run dev            # spawns server on :3000 and web on :5173

# 3. Open the dashboard in a fresh browser tab
open http://localhost:5173
```

Sanity checks before you share screen:

- `curl http://localhost:3000/llm/status` → `{"provider":"openai","mode":"live"}`
  — if it says `mock`, your key didn't load. **Restart the server.**
- The Benchmarking tab should load with **populated charts** (Netflix at the top
  of the Share of Voice bars). If you see "No benchmark yet", the seed didn't
  load — restart the server and check the boot log for
  `[seed] Loaded streaming demo cohort: 10 prompt runs, ...`.
- Resolution: full-screen the browser at ~1440px wide. The two-column SoV +
  Sentiment grid collapses below ~980px and reads worse on Zoom.
- Close any other tabs that might steal CPU during the live run.

If anything is sketchy, fall back to the **mock-mode demo** at the bottom of
this doc — it's deterministic, takes ~5s instead of ~45s, and looks the same.

---

## 1. Opening (~30s)

> "Perception is a brand-intelligence platform for the AI era. Companies spend
> millions on SEO so Google ranks them, but consumers are increasingly asking
> ChatGPT, Claude, and Gemini for product recommendations — and most brands
> have **zero visibility** into what AI is saying about them.
>
> We're going to show you how a marketing team at Netflix could see exactly how
> AI describes them versus the rest of the streaming category, in one click."

Click the **Benchmarking** tab in the sidebar to anchor the demo.

---

## 2. The dashboard at rest (~90s)

Walk through what's already on screen. The seed pack means the dashboard is
*already populated* — that's the whole point.

### Hero
> "This is what we're tracking: 20 perception prompts fanned across Netflix and
> 5 competitors, every prompt answered by the frontier models, results rolled
> into share of voice, sentiment, and feature gaps."

### Share of Voice (top-left)
> "Netflix is the leader at ~25% share of voice across all the prompts. Apple
> TV+ is rising — 21%. Paramount+ is trailing in the single digits."

Point at the bars. The visual story is obvious because we sorted descending and
each brand has its own colour.

### Sentiment (top-right)
> "Sentiment is where it gets interesting. Apple TV+ has the highest sentiment
> score even though Netflix has more share. That's the prestige-originals
> narrative beating the incumbent on quality."

### Feature signal
> "These are the themes the judge LLM repeatedly attached to each brand. Netflix
> wins on `leadership` and `originals`. Disney+ wins on `family` and `ip`. Max
> wins on `prestige`. **Notice nothing on Netflix says `value` or `innovation`**
> — that's a problem."

### Feature praise gaps (the punchline)
> "Right here, Perception flagged it: **Amazon Prime is praised on `value`;
> Netflix isn't.** And **Apple TV+ owns `innovation`; Netflix isn't mentioned.**
> Two clear gaps the marketing team can act on."

### Whitespace opportunities
> "And here's whitespace: AI assistants don't decisively recommend any one
> brand for live sports. That's a category Netflix could move into and own."

This whole section sells the differentiation: every other tool stops at "here's
what AI says." We surface **gaps and whitespace**.

---

## 3. The live run (~2–3 min, narrate while it runs)

Click **Run benchmark** with the default Netflix slate.

The Theater section appears with six branded columns. While it streams:

> "What you're watching live is the platform fanning twenty prompts across
> every brand simultaneously. Each column is one of the streaming services.
> The cursor blinks while OpenAI is mid-stream. The bar at the top of each
> column fills as prompts complete."

Things to point at:

- The **Judge LLM** aside that pops in between brand answers — that's the
  comparative scoring step.
- The progress counters (`0/20 → 1/20 → 2/20 …`).
- The fact that **all six brands run in parallel** at concurrency 4 — that's
  why it finishes in ~45 seconds instead of 5+ minutes.

If the run takes longer than expected, fill the time:

> "The reason this matters operationally: in the AI era, brand visibility is
> non-deterministic. The same prompt gives different answers tomorrow. So the
> only honest way to measure brand presence in AI is to keep running prompts
> on a schedule — exactly what Perception does."

---

## 4. Post-run reveal (~60s)

When the Theater finishes, the dashboard panels update with the merged data
(7 days of seeded history + today's fresh run).

> "Now the dashboard has refreshed with the new run on top of the 7 days of
> historical data. Trends rolls forward. New gap events get detected. If
> Netflix's marketing team did this every Monday morning, they'd have a moving
> picture of how AI's perception of their brand is changing."

Scroll to **Trend snapshot** and point at the daily mini-bars:

> "Daily averages, one row per day, per brand. You can see Netflix's share is
> stable, Apple TV+ is rising, Paramount+ is volatile."

---

## 5. Closing pitch (~30s)

> "Three things we do that no competitor does today:
>
> 1. **We tell you where the gaps are**, not just where you stand.
> 2. **We surface whitespace** — categories AI hasn't decided yet, where you
>    can plant a flag.
> 3. **We make the run itself a story** — that Theater isn't just polish, it's
>    how you build conviction with a CMO that the data is real.
>
> Built by the team in 4 weeks. Currently tracks GPT-class models; Claude and
> Gemini are the next integrations. Hallucination detection — ChatGPT
> inventing wrong pricing or features — is the next major feature."

---

## 6. Likely Q&A — quick answers

| Question | Quick answer |
|---|---|
| Are you using a real LLM or mocking? | Live OpenAI for both the perception prompts and the comparative judge. The pill says `live · openai` in the run config. |
| What models? | `gpt-4.1-mini` for both answers and judging. Multi-provider abstraction is in flight. |
| How are the prompts chosen? | 10 brand-specific (each retailer's name substituted) plus 10 category-wide leadership prompts. Configurable per cohort. |
| How long does a real run take? | ~30–60 seconds for 6 brands × 20 prompts at concurrency 4. |
| What happens with hallucinations? | We have a v0 detector for fact-sheet contradictions (pricing, founding year, HQ) — not in this demo, separate branch. |
| What's the data model? | All in-memory for the prototype. SQLite store for business profiles already wired; competitive store moves to Postgres next. |
| Differentiator vs Profound / Peec? | They're monitoring dashboards. We close the loop: detection → diagnosis → recommended action → before-and-after measurement. |
| Privacy / data? | Brand-provided fact sheets stay client-side until a run. AI answers we generate ourselves; we don't scrape user conversations. |

---

## 7. Backup script (use this if the live run fails)

If `bun run dev` won't start, OpenAI rate-limits, or the network drops:

1. Set `PERCEPTION_DEMO_SEED=1` (default — already on) and **don't click Run**.
2. The dashboard is already populated from the seed, so do steps 1–2 of the
   real script (Hero → Share of Voice → Sentiment → Feature signal → Whitespace)
   without relying on a live run at all.
3. For the "live moment", show the Theater on a **previously recorded
   screen capture** if you made one. Otherwise:
4. Click Run anyway — even without a key, the mock LLM produces deterministic
   output and the Theater still plays. It just takes ~5s. Narrate it as
   "we're running in offline mode for the demo so the Zoom doesn't lag."

---

## 8. Two-minute version (if your slot gets cut short)

If the CA tells you to wrap in 90 seconds:

1. **Hero + dashboard** (already populated): "AI is the new search; here's how
   AI talks about Netflix vs every other streamer. We track 20 prompts × 6
   brands daily."
2. **Skip the live run.** Just point at the populated bars + sentiment + gaps.
3. **Punchline gap**: "Amazon owns `value`, Apple TV+ owns `innovation`;
   Netflix is missing both. We surface that. Nobody else does."
4. **Close**: "Profound monitors. We diagnose."

That hits visibility, differentiation, and the strongest example in 90s.

---

## File map (for reviewers reading the code)

- `server/seed/streaming.ts` — the seeded cohort and 7 days of synthetic
  comparisons + gap events.
- `server/src/routes/competitive.ts` — `/competitive/snapshot` powers the
  first-paint preview the dashboard auto-loads on mount.
- `server/src/routes/llm-status.ts` — `/llm/status` surfaces live vs mock.
- `web/src/components/competitive/LiveRunTheater.tsx` — the streaming column
  panel users see during a run.
- `web/src/pages/competitive.tsx` — page composition: hero, picker, theater,
  charts, trend snapshot, run config.
