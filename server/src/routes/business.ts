import { Hono } from "hono";
import { z } from "zod";
import { businessProfiles } from "../db/business-profiles";

const profileSchema = z.object({
  name: z.string().trim().min(1),
  website: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const businessRoutes = new Hono();

businessRoutes.get("/business-profiles", (c) => {
  return c.json({ profiles: businessProfiles.list() });
});

businessRoutes.get("/business-profiles/:id", (c) => {
  const profile = businessProfiles.get(c.req.param("id"));
  return profile ? c.json(profile) : c.json({ error: "Business profile not found." }, 404);
});

businessRoutes.post("/business-profiles", async (c) => {
  const body = profileSchema.parse(await c.req.json());
  return c.json(businessProfiles.create(body), 201);
});

const competitorsSchema = z.object({
  competitorNames: z.array(z.string().trim().min(1)).length(5),
});

businessRoutes.get("/business-profiles/:id/competitors", (c) => {
  if (!businessProfiles.get(c.req.param("id"))) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  return c.json({ competitorNames: businessProfiles.competitors(c.req.param("id")) });
});

businessRoutes.put("/business-profiles/:id/competitors", async (c) => {
  const id = c.req.param("id");
  if (!businessProfiles.get(id)) {
    return c.json({ error: "Business profile not found." }, 404);
  }
  const body = competitorsSchema.parse(await c.req.json());
  return c.json({ competitorNames: businessProfiles.saveCompetitors(id, body.competitorNames) });
});
