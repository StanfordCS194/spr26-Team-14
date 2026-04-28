import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const dbPath = process.env.PERCEPTION_DB_PATH ?? join(import.meta.dir, "../../.data/perception.sqlite");

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
  `);
}

runMigrations();
