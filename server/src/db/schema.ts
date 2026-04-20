export const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS competitor_sets (
    id TEXT PRIMARY KEY,
    account_brand_id TEXT NOT NULL REFERENCES brands(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS competitor_set_members (
    competitor_set_id TEXT NOT NULL REFERENCES competitor_sets(id),
    competitor_brand_id TEXT NOT NULL REFERENCES brands(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (competitor_set_id, competitor_brand_id)
  );`,
  `CREATE TABLE IF NOT EXISTS prompt_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prompts_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS prompt_runs (
    id TEXT PRIMARY KEY,
    prompt_set_id TEXT NOT NULL REFERENCES prompt_sets(id),
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS ai_answers (
    id TEXT PRIMARY KEY,
    prompt_run_id TEXT NOT NULL REFERENCES prompt_runs(id),
    brand_id TEXT NOT NULL REFERENCES brands(id),
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS answer_mentions (
    ai_answer_id TEXT NOT NULL REFERENCES ai_answers(id),
    mentioned_brand_id TEXT NOT NULL REFERENCES brands(id),
    sentiment REAL NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ai_answer_id, mentioned_brand_id)
  );`,
  `CREATE TABLE IF NOT EXISTS feature_taxonomy (
    key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    category_key TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS feature_mentions (
    id TEXT PRIMARY KEY,
    ai_answer_id TEXT NOT NULL REFERENCES ai_answers(id),
    brand_id TEXT NOT NULL REFERENCES brands(id),
    feature_key TEXT NOT NULL REFERENCES feature_taxonomy(key),
    sentiment REAL NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS llm_comparisons (
    id TEXT PRIMARY KEY,
    prompt_run_id TEXT NOT NULL REFERENCES prompt_runs(id),
    model TEXT NOT NULL,
    comparison_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS benchmark_snapshots (
    id TEXT PRIMARY KEY,
    account_brand_id TEXT NOT NULL REFERENCES brands(id),
    competitor_set_id TEXT NOT NULL REFERENCES competitor_sets(id),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    metrics_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS gap_events (
    id TEXT PRIMARY KEY,
    gap_type TEXT NOT NULL,
    brand_id TEXT NOT NULL REFERENCES brands(id),
    competitor_brand_id TEXT REFERENCES brands(id),
    prompt_run_id TEXT NOT NULL REFERENCES prompt_runs(id),
    feature_key TEXT,
    category_key TEXT,
    evidence_json TEXT NOT NULL,
    confidence REAL NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS recommendation_inputs (
    id TEXT PRIMARY KEY,
    source_gap_event_id TEXT NOT NULL REFERENCES gap_events(id),
    payload_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
] as const;

export type TableName =
  | "brands"
  | "competitor_sets"
  | "competitor_set_members"
  | "prompt_sets"
  | "prompt_runs"
  | "ai_answers"
  | "answer_mentions"
  | "feature_taxonomy"
  | "feature_mentions"
  | "llm_comparisons"
  | "benchmark_snapshots"
  | "gap_events"
  | "recommendation_inputs";
