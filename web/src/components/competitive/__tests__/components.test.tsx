import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompetitiveSetPicker } from "../CompetitiveSetPicker";
import { LiveRunTheater } from "../LiveRunTheater";
import { WhitespacePanel } from "../WhitespacePanel";

describe("competitive components", () => {
  test("renders Sephora demo defaults and 5 competitor slots", () => {
    const html = renderToStaticMarkup(<CompetitiveSetPicker onCreate={async () => {}} />);
    expect(html.includes("Competitor 5")).toBeTrue();
    expect(html.includes("Sephora")).toBeTrue();
    expect(html.includes("Ulta")).toBeTrue();
    expect(html.includes("Olive Young")).toBeTrue();
  });

  test("LiveRunTheater renders nothing when idle", () => {
    const html = renderToStaticMarkup(
      <LiveRunTheater busy={false} progressStatus="" judgeLines={[]} progressByBrand={{}} />,
    );
    expect(html).toBe("");
  });

  test("LiveRunTheater shows columns and progress while running", () => {
    const html = renderToStaticMarkup(
      <LiveRunTheater
        busy
        progressStatus="Streaming brand summaries..."
        judgeLines={["who leads"]}
        progressByBrand={{
          b1: {
            brandName: "Sephora",
            status: "Streaming brand_specific summary…",
            activePrompt: "How is Sephora perceived?",
            lines: ["Sephora is widely regarded as a leader"],
            completedPrompts: 7,
          },
        }}
      />,
    );
    expect(html.includes("Live Run Theater")).toBeTrue();
    expect(html.includes("Sephora")).toBeTrue();
    expect(html.includes("7/20")).toBeTrue();
    expect(html.includes("theater__cursor")).toBeTrue();
  });

  test("renders whitespace counts", () => {
    const html = renderToStaticMarkup(
      <WhitespacePanel
        gaps={[
          {
            id: "1",
            gapType: "whitespace",
            brandId: "b1",
            promptRunId: "run-1",
            evidence: [],
            confidence: 0.8,
            detectedAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    expect(html.includes("Whitespace Opportunities")).toBeTrue();
  });
});
