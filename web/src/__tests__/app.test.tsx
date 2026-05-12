import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App, OnboardingForm, ProfileDashboard } from "../App";
import { AdminPage } from "../pages/admin";
import { MonitoringPage, SentimentTrend } from "../pages/monitoring";
import { RecommendationsPage } from "../pages/recommendations";
import { DEMO_BRAND_NAME } from "../seed/demo-content";

describe("app onboarding", () => {
  test("renders business profile fields", () => {
    const html = renderToStaticMarkup(<OnboardingForm onCreate={() => {}} />);
    expect(html.includes("Business name")).toBeTrue();
    expect(html.includes("Website")).toBeTrue();
    expect(html.includes("Description")).toBeTrue();
  });

  test("renders loading state before profiles load", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html.includes("Loading")).toBeTrue();
  });

  test("renders dashboard sections and profile selector", () => {
    const html = renderToStaticMarkup(
      <ProfileDashboard
        activePage="monitoring"
        activeProfileId="profile-1"
        onAddProfile={() => {}}
        onSelectPage={() => {}}
        onSelectProfile={() => {}}
        profiles={[
          {
            id: "profile-1",
            name: "Acme",
            website: "https://acme.test",
            description: "AI visibility software.",
            createdAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    expect(html.includes("Benchmarking")).toBeTrue();
    expect(html.includes("Admin")).toBeTrue();
    expect(html.includes("Active business profile")).toBeTrue();
  });

  test("renders monitoring loading state", () => {
    const html = renderToStaticMarkup(
      <MonitoringPage
        profile={{
          id: "profile-1",
          name: "Acme",
          website: "https://acme.test",
          description: "AI visibility software.",
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(html.includes("Generating starter prompts")).toBeTrue();
  });

  test("renders monitoring sentiment chart after load", () => {
    const html = renderToStaticMarkup(<SentimentTrend />);
    expect(html.includes("7 day sentiment trend")).toBeTrue();
  });

  test("renders recommendation feedback controls", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPage
        profile={{
          id: "profile-1",
          name: DEMO_BRAND_NAME,
          website: "https://netflix.test",
          description: "Streaming entertainment.",
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(html.includes("Was this recommendation useful?")).toBeTrue();
    expect(html.includes("Good")).toBeTrue();
    expect(html.includes("Bad")).toBeTrue();
  });

  test("renders admin feedback metrics section", () => {
    const html = renderToStaticMarkup(
      <AdminPage
        profile={{
          id: "profile-1",
          name: DEMO_BRAND_NAME,
          website: "https://netflix.test",
          description: "Streaming entertainment.",
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(html.includes("Feedback metrics")).toBeTrue();
    expect(html.includes("Loading admin metrics")).toBeTrue();
  });
});
