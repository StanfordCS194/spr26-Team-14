import { expect, test } from "bun:test";
import { parseMonitoringResponse } from "./parse-response";

test("parses brand position, recommendation, feature sentiment, and sources", () => {
  const parsed = parseMonitoringResponse(
    "Acme",
    "Acme is a recommended and reliable option with good support. See https://example.com/acme.",
  );

  expect(parsed.mentionPosition).toBe(0);
  expect(parsed.recommended).toBeTrue();
  expect(parsed.mentionSentiment).toBe("positive");
  expect(parsed.featureSentiment.support).toBe("positive");
  expect(parsed.sources).toEqual(["https://example.com/acme"]);
});

test("does not claim a mention when the brand is absent", () => {
  const parsed = parseMonitoringResponse("Acme", "Another product is a strong choice.");
  expect(parsed.mentionPosition).toBeNull();
  expect(parsed.recommended).toBeFalse();
  expect(parsed.score).toBe(0);
});
