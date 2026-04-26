import { useEffect, useState } from "react";
import "./app.css";
import { CompetitivePage } from "./pages/competitive";
import type { BusinessProfile } from "./types";

const API_BASE =
  import.meta.env.DEV === true ? "/api" : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

export function OnboardingForm({ onCreate }: { onCreate: (input: BusinessProfileInput) => void }) {
  const [form, setForm] = useState({ name: "", website: "", description: "" });
  const canSubmit = Object.values(form).every((value) => value.trim());

  return (
    <form
      className="onboarding"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onCreate(form);
        }
      }}
    >
      <h1>Set up your brand</h1>
      <label>
        Business name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label>
        Website
        <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={4}
        />
      </label>
      <button disabled={!canSubmit}>Create profile</button>
    </form>
  );
}

type BusinessProfileInput = Pick<BusinessProfile, "name" | "website" | "description">;

export function App() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/business-profiles`)
      .then((res) => res.json())
      .then((body: { profiles: BusinessProfile[] }) => setProfiles(body.profiles))
      .catch(() => setError("Could not load business profiles."))
      .finally(() => setLoading(false));
  }, []);

  async function createProfile(input: BusinessProfileInput) {
    setError("");
    const res = await fetch(`${API_BASE}/business-profiles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      setError("Could not save business profile.");
      return;
    }
    setProfiles([(await res.json()) as BusinessProfile]);
  }

  if (loading) {
    return <main className="page center-page">Loading...</main>;
  }

  if (!profiles.length) {
    return (
      <main className="page center-page">
        <OnboardingForm onCreate={createProfile} />
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  const profile = profiles[0]!;

  return (
    <main className="page">
      <header className="profile-header">
        <div>
          <p className="muted">Business profile</p>
          <h1>{profile.name}</h1>
        </div>
        <button type="button" onClick={() => setProfiles([])}>
          New profile
        </button>
      </header>
      <section className="profile-card">
        <strong>{profile.website}</strong>
        <span>{profile.description}</span>
      </section>
      <CompetitivePage />
      {error && <p className="error">{error}</p>}
    </main>
  );
}
