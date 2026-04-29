# Perception · Demo script (~6–8 minutes)

Walk the **sidebar** in this order: **Benchmarking → Monitoring → Recommendations → Sources**.  
Target: **~6–8 minutes** with the optional **live benchmark** block; **~6 minutes** if you skip live and stay on seeded data only.  
Demo cohort: seeded **Netflix vs Disney+ / Max / Amazon Prime Video / Apple TV+ / Paramount+** (`DEMO_BRAND_NAME` = `Netflix`).

Rough pacing:

| Block | Time |
|-------|------|
| Intro (value prop + seeded data) | ~60s |
| (1) Benchmarking | ~75–90s |
| (2) Monitoring | ~75s |
| (3) Recommendations | ~75s |
| (4) Sources | ~60–75s |
| Close | ~30–45s |
| **Optional:** Live benchmark + Theater | +60–90s |

---

## Intro (~60 seconds) — value prop + why the data is seeded

**Say:**

> *"Perception is brand intelligence for the AI layer — the same problem SEO solved for Google, but for ChatGPT-class answers. We measure how frontier chatbots talk about your brand versus competitors, then turn that into **gaps**, **sources**, and **fix-it actions**. Most tools stop at a visibility score; we care about **diagnosis and what to do next**."*

**Contrast (one breath):**

> *"Profound-style products show you share of voice; we’re building the loop **from detection → structured comparison → recommendations** so marketing isn’t stuck re-prompting ChatGPT by hand."*

**Technical honesty (seeded demo):**

> *"A full competitive pass fans prompts across every brand in the set. In production, one run is on the order of **140+ model calls** per benchmark: **120** parallel **answer** generations — six streamers × twenty prompts — **plus** one **comparative judge** invocation **per prompt** (twenty more). The judge returns **structured JSON**: share-of-voice weights that **sum to one**, **sentiment** per brand on a −1…+1 scale, and **feature tags** from a **fixed taxonomy** — `leadership`, `value`, `innovation`, and so on — so we can aggregate and trend without keyword spaghetti. After that we run **numerical rollups** for charts, gap heuristics, and whitespace. Doing the full pass live in a short slot adds **latency** and **run-to-run variance**; **today you’re seeing output hydrated from prior runs**: server-side snapshots plus demo cards in **`demo-content.ts`** that mirror what the pipeline produces."*

**Orientation:**

> *"I’ll walk four surfaces: **benchmarking**, **monitoring**, **recommendations**, and **sources** — then tie it together."*

---

## (1) Benchmarking (~75–90 seconds)

**Navigate:** sidebar → **Benchmarking**. First paint loads **`/competitive/snapshot?windowDays=7`**: overview, trends, and gap events merged so the room isn’t staring at spinners.

**Say (technical + narrative):**

- *"How does our scoring work?**. For every prompt we collect one answer per brand, then the **judge model** reads the full bundle and scores comparably — not a bag of keywords. That’s why share of voice is a **distribution** over brands that behaves like probability mass."*
- *"**Share of voice** — sorted bars, brand-colored — answers ‘who does AI name most across this prompt set?’ **Sentiment** is orthogonal: you can **win volume** and **lose narrative quality**. In this cohort, **Apple TV+** often shows stronger sentiment than raw share predicts — the ‘prestige originals’ story."*
- *"**Feature signal** is the judge’s rolled-up taxonomy: who *owns* `family` vs `value` vs `innovation`. Here’s the punchline on **Netflix**: we still see strength on **`leadership`** and **`originals`**, but the judge consistently underweights us on **`value`** versus **Amazon Prime** and on **`innovation`** versus **Apple TV+**. That isn’t vibes — it’s the same labels run across twenty prompts."*
- *"**Gaps** and **whitespace** turn those contrasts into product artifacts: competitor praised on a dimension you’re absent from, or **no brand owns the answer** — e.g. **live sports** is often fragmented. That’s the **diagnosis layer** competitors usually skip."*

**Optional one-liner:** *"If you hit **Run benchmark**, the **Theater** streams **SSE** events while workers pull answers at bounded **concurrency** — same **`pipeline.ts`** path, just visible."*

**Point at:** Share of voice → Sentiment → Feature chips → gap / whitespace panels → trend snapshot if time.

---

## (2) Monitoring (~75 seconds)

**Navigate:** sidebar → **Monitoring**.

**Say:**

- *"**Monitoring** is the day-two view: the **prompt library** your team actually cares about. Rows come from **`GET /business-profiles/:id/monitoring`**; each line is a real user-style query — ‘best streaming for families’, ‘who leads’, etc. — not internal jargon."*
- *"The **mention** column is **sentiment toward your brand on that prompt** — positive, neutral, negative — from our labeling pass, so you scan green/red without opening twenty chat transcripts."*
- *"The **7-day trend** is a coarse **health line**: AI outputs are **non-deterministic**; the honest operational model is **re-run the same prompts on a cadence** and watch drift. This chart is your early warning without spamming the API by hand."*
- *"The **Add a prompt** field is a real **`POST /monitoring-prompts`**: PMM adds a bet, we expand coverage. On first **onboarding**, starters can be **LLM-generated from the website + description** — you may briefly see a generating state."*

**Point at:** eyebrow + trend → table rows and pill colors → add prompt.

---

## (3) Recommendations (~75 seconds)

**Navigate:** sidebar → **Recommendations**.

**Say:**

- *"This tab is the **action layer**. Monitoring-only vendors leave you at ‘here’s your score’; we push **gap events** into **prioritized cards**: **on-site content**, **earned media**, and **technical** work — each tagged **high / medium / low impact** and **low / medium / high effort** so leads can triage."*
- *"Every card has two prose fields: **Signal** — the quantitative or qualitative hook from the benchmark — and **Suggested action** — something a team could ticket this week. That maps to our PRD **Fix-It Recommendations** and to **GEO**-style evidence: pages with **citations, stats, and quotes** tend to get retrieved and repeated more often; we’re operationalizing that research as tasks, not a whitepaper."*
- *"The **At a glance** row summarizes **active initiatives**, **high-impact** count, and **quick wins** — low effort with medium-or-better impact — so executives see throughput, not just a backlog."*
- *"Demo copy for Netflix ships from **`web/src/seed/demo-content.ts`**; wired product would attach the same cards to **live gap IDs** from the competitive store. Mention one example: reclaiming **value** from **Amazon Prime**, or **innovation** perception versus **Apple TV+**, or **live sports** whitespace."*

**Point at:** stats row → 2–3 cards (read titles + one Signal / action pair out loud if time allows).

---

## (4) Sources (~60–75 seconds)

**Navigate:** sidebar → **Sources**.

**Say:**

- *"**Sources** is **attribution** for the AI channel. McKinsey-style stats say most of what models cite isn’t your homepage — it’s **Reddit**, **press**, **review sites**, **YouTube**, **wiki**-class pages. If you don’t see that inventory, you can’t run a PR or SEO program **for generative answers**."*
- *"The panel rolls up **citations per week**, split **Reddit** vs **news & reviews**, then a **table**: title, domain, **type badge**, **which brands** that URL props up, **sentiment**, and a numeric **citation count**. That’s how comms answers ‘where should we pitch or place next?’ tied to **what the model already trusts**."*
- *"Seeded rows match the Netflix cohort for first paint; production would assemble this from **parsed citations** on benchmark and monitoring responses. It’s the bridge between **llms’ stated answer** and **corpus / retrieval bias**."*

**Point at:** summary tiles → one Reddit row vs one publication row → cite count column.

---

## Close (~30–45 seconds)

**Say:**

> *"Putting it together: **Benchmarking** is judge-structured competitive truth; **Monitoring** is your prompt cadence and drift; **Recommendations** turn gaps into owned work; **Sources** show which third-party proof reinforces each narrative. That’s the loop we want a team inside — **AI visibility that’s measurable and actionable**, not a one-off ChatGPT screenshot."*

---

## Optional: Live benchmark + Theater (+60–90 seconds)

Use when you have **OpenAI configured**, bandwidth, and a **risk appetite** for latency.

1. Stay on **Benchmarking**. Click **Run benchmark** (Netflix slate).
2. **Narrate while columns stream:** six brands in parallel, **~20 prompts** each column, **judge** firing between prompts, progress line in the UI.
3. **Say:** *"Same code path as batch: **`generateBrandAnswer`** per cell, **`judgeComparativeOutputs`** per prompt, then merge into the server’s **competitive store** (in-memory maps today; business profiles and prompts live in **SQLite**) — the Theater is **telemetry**, not a separate hack."*
4. When the run completes, **scroll** the refreshed charts and **one** gap row to show the **before/after** story.

**If the run fails:** fall back to *"we’re on snapshot-only for time"* — seeded data already covers the narrative.

---

## Pre-flight (presenters)

```bash
bun install   # once
bun run dev   # API :3000, web :5173
open http://localhost:5173
```

**Sanity checks:**

- Boot logs show seed lines for the streaming cohort + Netflix profile (`PERCEPTION_DEMO_SEED` unless disabled).
- **Netflix** selected in the profile switcher — Recommendations and Sources populate.
- Benchmarking charts render without running a job.
- Optional: `curl http://localhost:3000/llm/status` → `live` vs `mock`.

**Backup:** Skip the live block; narrate **140+ calls**, **judge JSON**, and **seeded snapshot**.

---

## If they ask (elevator answers)

| Question | Answer |
|----------|--------|
| Real LLM or fake? | Judge + answers use the configured provider; demo **snapshot** is from stored runs. Mock mode if no key. |
| Why not keyword counts? | Judge constrains outputs to **schema + taxonomy**; scales to messy prose. |
| Where is data? | **Business profiles** and monitoring prompts in **SQLite**; **competitive runs** (answers, comparisons, gaps) in an **in-memory store** on the API process — see `server/src/db/store.ts` and routes under `competitive`. |
| vs Profound / Peec? | They skew **monitoring**; we push **gaps → recommendations → (eventually) before/after** per prompt. |
| Hallucinations? | **Accuracy guard / fact sheet** is roadmap; mention v0 work if applicable on your branch. |

---

## Reference — where this is implemented

| Area | Location |
|------|----------|
| Competitive snapshot & pipeline | `server/src/routes/competitive.ts`, `server/src/features/competitive/pipeline.ts` |
| Judge schema / LLM | `server/src/lib/llm.ts` (`judgeComparativeOutputs`, `generateBrandAnswer`) |
| Streaming demo seed | `server/seed/streaming.ts`, `server/seed/netflix-profile.ts` |
| Recs & sources (demo brand) | `web/src/seed/demo-content.ts` |
| UI pages | `web/src/pages/competitive.tsx`, `monitoring.tsx`, `recommendations.tsx`, `sources.tsx` |
| Theater / SSE | `web/src/components/competitive/LiveRunTheater.tsx` |