import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
const defaultDbPath = isTest
  ? join(tmpdir(), `perception-test-${process.pid}.sqlite`)
  : join(import.meta.dir, "../../.data/perception.sqlite");
const dbPath = process.env.PERCEPTION_DB_PATH ?? defaultDbPath;

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS business_competitors (
      business_profile_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (business_profile_id, position),
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_setup_state (
      business_profile_id TEXT PRIMARY KEY,
      monitoring_status TEXT NOT NULL,
      error TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monitoring_prompts (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      mention_sentiment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      business_profile_id TEXT NOT NULL,
      recommendation_id TEXT NOT NULL,
      rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (business_profile_id, recommendation_id),
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monitoring_results (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      monitoring_prompt_id TEXT NOT NULL,
      score REAL NOT NULL,
      mention_sentiment TEXT NOT NULL,
      answer_summary TEXT NOT NULL,
      sources_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (monitoring_prompt_id) REFERENCES monitoring_prompts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monitoring_runs (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monitoring_attempts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      business_profile_id TEXT NOT NULL,
      monitoring_prompt_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      raw_response TEXT,
      score REAL,
      mention_sentiment TEXT,
      mention_position INTEGER,
      recommended INTEGER NOT NULL DEFAULT 0,
      feature_sentiment_json TEXT NOT NULL DEFAULT '{}',
      sources_json TEXT NOT NULL DEFAULT '[]',
      error TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES monitoring_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (monitoring_prompt_id) REFERENCES monitoring_prompts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS monitoring_attempts_profile_created_idx
      ON monitoring_attempts (business_profile_id, created_at);

    CREATE TABLE IF NOT EXISTS profile_recommendations (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      source_gap_event_id TEXT NOT NULL,
      source_attempt_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      impact TEXT NOT NULL,
      effort TEXT NOT NULL,
      evidence TEXT NOT NULL,
      action TEXT NOT NULL,
      target_provider TEXT,
      status TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (business_profile_id, source_gap_event_id),
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS source_citations (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      monitoring_attempt_id TEXT NOT NULL,
      monitoring_prompt_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      domain TEXT NOT NULL,
      source_type TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      brands_mentioned_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (monitoring_attempt_id, canonical_url),
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (monitoring_attempt_id) REFERENCES monitoring_attempts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS citation_grounding_checks (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      monitoring_attempt_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      claim_count INTEGER NOT NULL,
      cited_claim_count INTEGER NOT NULL,
      coverage REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (monitoring_attempt_id) REFERENCES monitoring_attempts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS citation_grounding_alerts (
      id TEXT PRIMARY KEY,
      business_profile_id TEXT NOT NULL,
      monitoring_attempt_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      claim_text TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (monitoring_attempt_id, claim_text),
      FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (monitoring_attempt_id) REFERENCES monitoring_attempts(id) ON DELETE CASCADE
    );

  `);

  const promptColumns = new Set(
    db.query<{ name: string }, []>("PRAGMA table_info(monitoring_prompts)").all().map((column) => column.name),
  );
  if (!promptColumns.has("category")) {
    db.exec("ALTER TABLE monitoring_prompts ADD COLUMN category TEXT NOT NULL DEFAULT 'custom'");
  }
  if (!promptColumns.has("cadence")) {
    db.exec("ALTER TABLE monitoring_prompts ADD COLUMN cadence TEXT NOT NULL DEFAULT 'daily'");
  }
  if (!promptColumns.has("active")) {
    db.exec("ALTER TABLE monitoring_prompts ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  }
}

runMigrations();
