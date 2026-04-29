import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompetitiveSetPicker } from "../CompetitiveSetPicker";
import { WhitespacePanel } from "../WhitespacePanel";

describe("competitive components", () => {
  test("renders demo defaults and 5 competitor slots", () => {
    const html = renderToStaticMarkup(<CompetitiveSetPicker onCreate={async () => {}} />);
    const nums = (html.match(/picker__num/g) ?? []).length;
    expect(nums).toBe(5);
    expect(html.toLowerCase().includes("your brand")).toBeTrue();
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
    expect(html.toLowerCase().includes("whitespace opportunities")).toBeTrue();
  });
});
