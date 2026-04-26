import { db } from "./client";

export interface BusinessProfile {
  id: string;
  name: string;
  website: string;
  description: string;
  createdAt: string;
}

interface BusinessProfileRow {
  id: string;
  name: string;
  website: string;
  description: string;
  created_at: string;
}

export type NewBusinessProfile = Pick<BusinessProfile, "name" | "website" | "description">;

function fromRow(row: BusinessProfileRow): BusinessProfile {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    description: row.description,
    createdAt: row.created_at,
  };
}

const insertProfile = db.query<BusinessProfileRow, [string, string, string, string, string]>(`
  INSERT INTO business_profiles (id, name, website, description, created_at)
  VALUES (?, ?, ?, ?, ?)
  RETURNING id, name, website, description, created_at
`);

const listProfiles = db.query<BusinessProfileRow, []>(`
  SELECT id, name, website, description, created_at
  FROM business_profiles
  ORDER BY created_at DESC
`);

const getProfile = db.query<BusinessProfileRow, [string]>(`
  SELECT id, name, website, description, created_at
  FROM business_profiles
  WHERE id = ?
`);

interface CompetitorRow {
  name: string;
}

const deleteCompetitors = db.query<null, [string]>(`
  DELETE FROM business_competitors
  WHERE business_profile_id = ?
`);

const insertCompetitor = db.query<null, [string, number, string, string]>(`
  INSERT INTO business_competitors (business_profile_id, position, name, updated_at)
  VALUES (?, ?, ?, ?)
`);

const listCompetitors = db.query<CompetitorRow, [string]>(`
  SELECT name
  FROM business_competitors
  WHERE business_profile_id = ?
  ORDER BY position
`);

export const businessProfiles = {
  create(input: NewBusinessProfile) {
    const now = new Date().toISOString();
    return fromRow(insertProfile.get(crypto.randomUUID(), input.name, input.website, input.description, now)!);
  },

  list() {
    return listProfiles.all().map(fromRow);
  },

  get(id: string) {
    const row = getProfile.get(id);
    return row ? fromRow(row) : null;
  },

  competitors(id: string) {
    return listCompetitors.all(id).map((row) => row.name);
  },

  saveCompetitors(id: string, names: string[]) {
    const now = new Date().toISOString();
    db.transaction(() => {
      deleteCompetitors.run(id);
      names.forEach((name, index) => insertCompetitor.run(id, index, name, now));
    })();
    return this.competitors(id);
  },
};
