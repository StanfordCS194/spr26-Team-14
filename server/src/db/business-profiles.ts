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
};
