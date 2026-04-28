import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App, OnboardingForm, ProfileDashboard } from "../App";
import { MonitoringPage, SentimentTrend } from "../pages/monitoring";

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
});
