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
