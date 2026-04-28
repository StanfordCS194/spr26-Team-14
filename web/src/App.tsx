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
        <input
          type="url"
          value={form.website}
          onChange={(event) => setForm({ ...form, website: event.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={4}
        />
      </label>
      <button type="submit" disabled={!canSubmit}>
        Create profile
      </button>
    </form>
  );
}

type BusinessProfileInput = Pick<BusinessProfile, "name" | "website" | "description">;
const pages = [
  ["monitoring", "Monitoring", "Track AI mention frequency, sentiment, share of voice, and trends over time."],
  ["benchmarking", "Benchmarking", "Compare your brand against competitors across AI answers."],
  ["recommendations", "Recommendations", "Prioritized fix-it ideas will appear here after monitoring finds gaps."],
  ["source-tracking", "Source Tracking", "Cited Reddit threads, publications, reviews, and other sources will appear here."],
] as const;

type PageKey = (typeof pages)[number][0];

export function App() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [activePage, setActivePage] = useState<PageKey>("monitoring");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/business-profiles`)
      .then((res) => res.json())
      .then((body: { profiles: BusinessProfile[] }) => {
        setProfiles(body.profiles);
        setActiveProfileId(body.profiles[0]?.id ?? "");
      })
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
    const profile = (await res.json()) as BusinessProfile;
    setProfiles((current) => [profile, ...current]);
    setActiveProfileId(profile.id);
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

  return (
    <ProfileDashboard
      activePage={activePage}
      activeProfileId={activeProfileId}
      error={error}
      onAddProfile={() => setProfiles([])}
      onSelectPage={setActivePage}
      onSelectProfile={setActiveProfileId}
      profiles={profiles}
    />
  );
}

export function ProfileDashboard({
  activePage,
  activeProfileId,
  error,
  onAddProfile,
  onSelectPage,
  onSelectProfile,
  profiles,
}: {
  activePage: PageKey;
  activeProfileId: string;
  error?: string;
  onAddProfile: () => void;
  onSelectPage: (page: PageKey) => void;
  onSelectProfile: (id: string) => void;
  profiles: BusinessProfile[];
}) {
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0]!;
  const page = pages.find(([key]) => key === activePage) ?? pages[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <strong>Perception</strong>
        <label>
          Business
          <select
            aria-label="Active business profile"
            value={profile.id}
            onChange={(event) => onSelectProfile(event.target.value)}
          >
            {profiles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select value={activePage} onChange={(event) => onSelectPage(event.target.value as PageKey)}>
            {pages.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="muted">Business profile</p>
            <h1>{profile.name}</h1>
          </div>
          <button type="button" onClick={onAddProfile}>
            New profile
          </button>
        </header>

        {activePage === "benchmarking" ? (
          <CompetitivePage businessName={profile.name} businessProfileId={profile.id} />
        ) : (
          <article className="panel">
            <p className="muted">{page[1]}</p>
            <h2>{profile.name}</h2>
            <p>{page[2]}</p>
            <dl>
              <div>
                <dt>Website</dt>
                <dd>{profile.website}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{profile.description}</dd>
              </div>
            </dl>
          </article>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
