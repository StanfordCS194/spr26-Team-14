# Perception Architecture

## Runtime

Perception is a Bun monorepo:

- `web/`: React and Vite dashboard
- `server/`: Hono API, provider adapters, analysis services, and SQLite persistence
- `server/.data/perception.sqlite`: local durable application data

The app runs with `bun run dev`; Vite proxies `/api` requests to the Hono server.

## Core Data Flow

1. Onboarding creates a business profile, exactly five competitors, optional ground-truth facts, and starter prompts.
2. Active prompts become due according to daily or weekly cadence.
3. A monitoring run queries OpenAI, Claude, and Gemini independently.
4. Every provider attempt is persisted, including failures, raw text, parsed sentiment, mention position, recommendation signal, feature sentiment, and citations.
5. Successful attempts feed four downstream workflows:
   - Accuracy Guard compares claims with active brand facts.
   - Competitive benchmarking calculates share of voice, sentiment, trends, gaps, and whitespace.
   - Fix-It recommendations materialize from persisted gaps and track lifecycle and measured lift.
   - Source attribution canonicalizes citations and ranks them by observed frequency.

Partial provider failures do not discard successful responses.

## Persistence Boundaries

SQLite owns user-facing product state:

- profiles, competitors, and prompt configuration
- monitoring runs and provider attempts
- ground-truth facts and accuracy alerts
- recommendations, lifecycle status, and feedback
- source citations

The older competitive demo pipeline retains an in-memory store only for standalone demo compatibility. Profile dashboard workflows use the SQLite-backed monitoring path.

## Provider Configuration

Set provider keys in `server/.env`:

```dotenv
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

Optional model overrides and alert integration settings are documented in `server/.env.example`.

## Verification

Run:

```bash
bun test
bun run build:web
```

The suite covers profile isolation, three-provider persistence, partial failures, parsing, cadence, Accuracy Guard, competitive aggregation, recommendation lift, and source normalization.
