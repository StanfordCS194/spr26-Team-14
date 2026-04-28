import { Hono } from "hono";
import { expect, test } from "bun:test";
import { businessProfiles } from "../db/business-profiles";
import { businessRoutes } from "./business";

process.env.DISABLE_ONBOARDING_PROMPT_GENERATION = "1";

const app = new Hono().route("/", businessRoutes);

test("creates and lists business profiles", async () => {
  const name = `Acme ${crypto.randomUUID()}`;
  const createRes = await app.request("/business-profiles", {
    method: "POST",
    body: JSON.stringify({
      name,
      website: "https://acme.test",
      description: "Project management software for growing teams.",
    }),
    headers: { "content-type": "application/json" },
  });

  expect(createRes.status).toBe(201);
  const created = await createRes.json();
  expect(created.name).toBe(name);

  const listRes = await app.request("/business-profiles");
  const listBody = await listRes.json();
  expect(listBody.profiles.some((profile: { id: string }) => profile.id === created.id)).toBe(true);
  expect(businessProfiles.get(created.id)?.website).toBe("https://acme.test");
});

test("saves competitors for a business profile", async () => {
  const profile = businessProfiles.create({
    name: `Bench ${crypto.randomUUID()}`,
    website: "https://bench.test",
    description: "Benchmarking test profile.",
  });

  const response = await app.request(`/business-profiles/${profile.id}/competitors`, {
    method: "PUT",
    body: JSON.stringify({ competitorNames: ["A", "B", "C", "D", "E"] }),
    headers: { "content-type": "application/json" },
  });

  expect(response.status).toBe(200);
  expect((await response.json()).competitorNames).toEqual(["A", "B", "C", "D", "E"]);
});

test("adds monitoring prompts for a business profile", async () => {
  const profile = businessProfiles.create({
    name: `Monitor ${crypto.randomUUID()}`,
    website: "https://monitor.test",
    description: "Monitoring test profile.",
  });

  const response = await app.request(`/business-profiles/${profile.id}/monitoring-prompts`, {
    method: "POST",
    body: JSON.stringify({ prompt: "What is the best monitoring platform for AI search?" }),
    headers: { "content-type": "application/json" },
  });
  expect(response.status).toBe(201);

  const listRes = await app.request(`/business-profiles/${profile.id}/monitoring`);
  const listBody = await listRes.json();
  expect(listBody.prompts).toHaveLength(1);
  expect(listBody.prompts[0].mentionSentiment).toBeTruthy();
});
