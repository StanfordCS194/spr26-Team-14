import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../App";
import { MonitoringPage } from "../pages/monitoring";
import { RecommendationsPage } from "../pages/recommendations";
import { SourcesPage } from "../pages/sources";

describe("dashboard shell", () => {
  test("renders the main navigation", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html.includes("Perception")).toBeTrue();
    expect(html.includes("Monitoring")).toBeTrue();
    expect(html.includes("Benchmarking")).toBeTrue();
    expect(html.includes("Recommendations")).toBeTrue();
    expect(html.includes("Sources")).toBeTrue();
  });

  test("renders placeholder pages", () => {
    expect(renderToStaticMarkup(<MonitoringPage />).includes("Prompt Queue")).toBeTrue();
    expect(renderToStaticMarkup(<RecommendationsPage />).includes("Recommended Actions")).toBeTrue();
    expect(renderToStaticMarkup(<SourcesPage />).includes("Influential Sources")).toBeTrue();
  });
});
