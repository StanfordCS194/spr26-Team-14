import { db } from "./client";

export interface BenchmarkSnapshotData {
  timeframe: { start: string; end: string };
  brandLabels: Record<string, string>;
  accountBrandId: string | null;
  accountBrandName: string | null;
  competitorBrandIds: string[];
  overview: unknown;
  trends: unknown;
  gaps: unknown[];
}

export interface BenchmarkCitation {
  url: string;
  claim: string;
  brandId: string | null;
  brandName: string | null;
  prompt: string | null;
  promptKind: string | null;
  promptRunId: string;
}

interface SnapshotRow {
  business_profile_id: string;
  snapshot_json: string;
  citations_json: string;
  sources_json: string;
  created_at: string;
  updated_at: string;
}

const upsertSnapshot = db.query<null, [string, string, string, string, string, string]>(`
  INSERT INTO benchmark_snapshots (
    business_profile_id, snapshot_json, citations_json, sources_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(business_profile_id) DO UPDATE SET
    snapshot_json = excluded.snapshot_json,
    citations_json = excluded.citations_json,
    sources_json = excluded.sources_json,
    updated_at = excluded.updated_at
`);

const getSnapshot = db.query<SnapshotRow, [string]>(`
  SELECT * FROM benchmark_snapshots WHERE business_profile_id = ?
`);

export const benchmarkSnapshots = {
  upsert(input: {
    businessProfileId: string;
    snapshot: BenchmarkSnapshotData;
    citations: BenchmarkCitation[];
    sources: unknown[];
  }) {
    const now = new Date().toISOString();
    upsertSnapshot.run(
      input.businessProfileId,
      JSON.stringify(input.snapshot),
      JSON.stringify(input.citations),
      JSON.stringify(input.sources),
      now,
      now,
    );
  },

  get(businessProfileId: string): BenchmarkSnapshotData | null {
    const row = getSnapshot.get(businessProfileId);
    return row ? (JSON.parse(row.snapshot_json) as BenchmarkSnapshotData) : null;
  },

  citations(businessProfileId: string): BenchmarkCitation[] {
    const row = getSnapshot.get(businessProfileId);
    return row ? (JSON.parse(row.citations_json) as BenchmarkCitation[]) : [];
  },
};
