import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadNetflixProfileSeed } from "../seed/netflix-profile";
import { loadStreamingSeed } from "../seed/streaming";
import { businessRoutes } from "./routes/business";
import { competitiveRoutes } from "./routes/competitive";

if ((process.env.PERCEPTION_DEMO_SEED ?? "1") !== "0") {
  const cohort = loadStreamingSeed();
  console.log(
    `[seed] Loaded streaming demo cohort: ${cohort.promptRunCount} prompt runs, ${cohort.comparisonCount} comparisons, ${cohort.gapEventCount} gap events.`,
  );

  const profile = loadNetflixProfileSeed();
  console.log(
    profile.created
      ? `[seed] Created Netflix business profile (${profile.profileId}) with ${profile.monitoringCount} monitoring prompts.`
      : `[seed] Netflix business profile already exists (${profile.profileId}); ${profile.monitoringCount} monitoring prompts.`,
  );
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", businessRoutes);
app.route("/", competitiveRoutes);

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
