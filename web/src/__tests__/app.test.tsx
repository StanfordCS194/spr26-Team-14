import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App, OnboardingForm } from "../App";

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
});
