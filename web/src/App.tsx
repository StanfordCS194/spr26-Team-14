import { useEffect, useState } from "react";
import "./app.css";
import { API_BASE } from "./api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AccuracyPage } from "./pages/accuracy";
import { AdminPage } from "./pages/admin";
import { CompetitivePage } from "./pages/competitive";
import { MonitoringPage } from "./pages/monitoring";
import { RecommendationsPage } from "./pages/recommendations";
import { SourcesPage } from "./pages/sources";
import type { BusinessProfile, BusinessProfileInput } from "./types";
import {
  BinocularsIcon,
  BuildingsIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  GearSixIcon,
  LightbulbIcon,
  LinkSimpleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "./components/app-icons";
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
      className="w-full max-w-xl"
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
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <Badge className="mb-2 w-fit" variant="secondary">
            <SparkleDot /> Brand setup
          </Badge>
          <CardTitle className="text-2xl">Set up your brand</CardTitle>
          <CardDescription>
            We&rsquo;ll generate starter monitoring prompts and a competitive set from your website and brand
            description.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business-website">Website</Label>
            <Input
              id="business-website"
              type="url"
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business-description">Description</Label>
            <Textarea
              id="business-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business-competitors">Top 5 competitors (one per line)</Label>
            <Textarea
              id="business-competitors"
              value={form.competitors}
              onChange={(event) => setForm({ ...form, competitors: event.target.value })}
              rows={5}
            />
          </div>
          <Button type="submit" disabled={!canSubmit} className="w-fit">
            <CheckCircleIcon data-icon="inline-start" />
            Create profile
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

const navItems = [
  {
    key: "monitoring",
    label: "Monitoring",
    description: "AI mention frequency, sentiment, and trends.",
    icon: ChartLineUpIcon,
  },
  {
    key: "accuracy",
    label: "Citation Grounding",
    description: "Claim-level source coverage and unsupported-claim alerts.",
    icon: ShieldCheckIcon,
  },
  {
    key: "benchmarking",
    label: "Benchmarking",
    description: "Compare your brand against competitors in AI answers.",
    icon: TrophyIcon,
  },
  {
    key: "recommendations",
    label: "Recommendations",
    description: "Prioritized fix-it ideas from detected gaps.",
    icon: LightbulbIcon,
  },
  {
    key: "sources",
    label: "Sources",
    description: "Reddit, publications, reviews, and other sources AI cites.",
    icon: LinkSimpleIcon,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Internal feedback quality metrics and system health.",
    icon: GearSixIcon,
  },
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
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-border/70 bg-sidebar px-3 py-4 text-sidebar-foreground" aria-label="Primary navigation">
        <div className="flex items-center gap-3 px-2 pb-4">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-background ring-1 ring-border/70">
            <img className="size-6 object-contain" src={logoUrl} alt="" aria-hidden="true" />
          </div>
          <div className="grid leading-tight">
            <strong className="text-sm font-semibold tracking-tight">Perception</strong>
            <span className="text-xs text-muted-foreground">AI visibility</span>
          </div>
        </div>

        <Separator className="mb-3" />

        <nav className="grid gap-1" aria-label="Sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <Button
                key={item.key}
                type="button"
                variant={active ? "secondary" : "ghost"}
                className="h-auto justify-start gap-3 rounded-2xl px-3 py-2 text-left"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelectPage(item.key)}
              >
                <Icon className="size-4 text-muted-foreground" data-icon="inline-start" />
                <span className="grid">
                  <span>{item.label}</span>
                  <span className="line-clamp-1 text-xs font-normal text-muted-foreground">{item.description}</span>
                </span>
              </Button>
            );
          })}
        </nav>

        <Card className="mt-auto border-border/70 bg-background/80 shadow-none" size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <BuildingsIcon className="size-4" /> Active brand
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <NativeSelect
              aria-label="Active business profile"
              className="w-full"
              value={profile.id}
              onChange={(event) => onSelectProfile(event.target.value)}
            >
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" onClick={onAddProfile}>
              <PlusIcon data-icon="inline-start" />
              Add brand
            </Button>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0 bg-background px-5 py-6 md:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
            <div>
              <Badge variant="outline" className="mb-3">
                <BinocularsIcon data-icon="inline-start" />
                {profile.name}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">{activeNav.label}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{activeNav.description}</p>
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
        </div>
      </section>
    </main>
  );
}

function SparkleDot() {
  return <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />;
}
