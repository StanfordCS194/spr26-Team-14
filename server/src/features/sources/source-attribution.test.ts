import { expect, test } from "bun:test";
import { normalizeSourceUrl } from "./source-attribution";

test("canonicalizes source URLs and removes tracking parameters", () => {
  expect(
    normalizeSourceUrl("https://WWW.Example.com/article/?utm_source=chatgpt&ref=sidebar&id=42#section"),
  ).toBe("https://example.com/article?id=42");
});

test("rejects values that are not absolute URLs", () => {
  expect(() => normalizeSourceUrl("example.com/article")).toThrow();
});
