import { useEffect, useState } from "react";
import "./app.css";
import { API_BASE } from "./api";
import { AccuracyPage } from "./pages/accuracy";
import { AdminPage } from "./pages/admin";
import { CompetitivePage } from "./pages/competitive";
import { MonitoringPage } from "./pages/monitoring";
import { RecommendationsPage } from "./pages/recommendations";
import { SourcesPage } from "./pages/sources";
import type { BusinessProfile, BusinessProfileInput } from "./types";
import logoUrl from "../../assets/logo.svg";

export function OnboardingForm({ onCreate }: { onCreate: (input: BusinessProfileInput) => void }) {
  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    competitors: "",
  });
  const competitorNames = form.competitors.split("\n").map((value) => value.trim()).filter(Boolean);
  const canSubmit = Boolean(
    form.name.trim() &&
    form.website.trim() &&
    form.description.trim() &&
    competitorNames.length === 5
  );

  return (
    <form
      className="onboarding"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onCreate({
            name: form.name,
            website: form.website,
            description: form.description,
            competitorNames,
          });
        }
      }}
    >
      <h1>Set up your brand</h1>
      <p className="muted">
        We&rsquo;ll generate starter monitoring prompts and a competitive set from your website and brand
        description.
      </p>
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
      <label>
        Top 5 competitors (one per line)
        <textarea
          value={form.competitors}
          onChange={(event) => setForm({ ...form, competitors: event.target.value })}
          rows={5}
        />
      </label>
      <button type="submit" disabled={!canSubmit}>
        Create profile
      </button>
    </form>
  );
}

const navItems = [
  { key: "monitoring", label: "Monitoring", description: "AI mention frequency, sentiment, and trends." },
  { key: "accuracy", label: "Citation Grounding", description: "Claim-level source coverage and unsupported-claim alerts." },
  { key: "benchmarking", label: "Benchmarking", description: "Compare your brand against competitors in AI answers." },
  { key: "recommendations", label: "Recommendations", description: "Prioritized fix-it ideas from detected gaps." },
  { key: "sources", label: "Sources", description: "Reddit, publications, reviews, and other sources AI cites." },
  { key: "admin", label: "Admin", description: "Internal feedback quality metrics and system health." },
] as const;

type PageKey = (typeof navItems)[number]["key"];

export function App() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [activePage, setActivePage] = useState<PageKey>("benchmarking");
  const [addingProfile, setAddingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/business-profiles`)
      .then((res) => res.json())
      .then((body: { profiles: BusinessProfile[] }) => {
        setProfiles(body.profiles);
        // Prefer the seeded demo brand if it exists, otherwise the first profile.
        const seeded = body.profiles.find((p) => p.name === "Netflix");
        setActiveProfileId((seeded ?? body.profiles[0])?.id ?? "");
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
    setActivePage("monitoring");
    setAddingProfile(false);
  }

  if (loading) {
    return <main className="page center-page">Loading…</main>;
  }

  if (addingProfile || !profiles.length) {
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
      onAddProfile={() => setAddingProfile(true)}
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
  const activeNav = navItems.find((item) => item.key === activePage) ?? navItems[0];

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <img className="brand-mark" src={logoUrl} alt="" aria-hidden="true" />
          <div className="brand-lockup__text">
            <strong>Perception</strong>
            <span>AI visibility</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Sections">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? "nav-item active" : "nav-item"}
              onClick={() => onSelectPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer__label">Active brand</span>
          <select
            className="sidebar-profile"
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
          <button type="button" className="sidebar-add" onClick={onAddProfile}>
            + Add brand
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">
              <span className="topbar__brand">{profile.name}</span>
            </p>
            <h1>{activeNav.label}</h1>
            <p className="topbar__sub">{activeNav.description}</p>
          </div>
        </header>

        <section hidden={activePage !== "benchmarking"}>
          <CompetitivePage businessName={profile.name} businessProfileId={profile.id} />
        </section>

        {activePage === "monitoring" ? (
          <MonitoringPage profile={profile} />
        ) : activePage === "accuracy" ? (
          <AccuracyPage profile={profile} />
        ) : activePage === "recommendations" ? (
          <RecommendationsPage profile={profile} />
        ) : activePage === "sources" ? (
          <SourcesPage profile={profile} />
        ) : activePage === "admin" ? (
          <AdminPage profile={profile} />
        ) : null}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
