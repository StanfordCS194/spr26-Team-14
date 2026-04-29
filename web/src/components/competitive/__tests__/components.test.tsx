import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompetitiveSetPicker } from "../CompetitiveSetPicker";
import { WhitespacePanel } from "../WhitespacePanel";

describe("competitive components", () => {
  test("renders streaming demo defaults and 5 competitor slots", () => {
    const html = renderToStaticMarkup(<CompetitiveSetPicker onCreate={async () => {}} />);
    expect(html.includes("Competitor 5")).toBeTrue();
    expect(html.includes("Netflix")).toBeTrue();
    expect(html.includes("Disney+")).toBeTrue();
    expect(html.includes("Paramount+")).toBeTrue();
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
