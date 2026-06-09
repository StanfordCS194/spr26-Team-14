import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadNetflixProfileSeed } from "../seed/netflix-profile";
import { loadStreamingSeed } from "../seed/streaming";
import { businessRoutes } from "./routes/business";
import { competitiveRoutes } from "./routes/competitive";
import { llmStatusRoutes } from "./routes/llm-status";

if ((process.env.PERCEPTION_DEMO_SEED ?? "1") !== "0") {
  const cohort = loadStreamingSeed();
  console.log(
    `[seed] Loaded streaming demo cohort: ${cohort.promptRunCount} prompt runs, ${cohort.comparisonCount} comparisons, ${cohort.gapEventCount} gap events.`,
  );

  const profile = loadNetflixProfileSeed();
  console.log(
    profile.created
      ? `[seed] Created Netflix business profile (${profile.profileId}) with ${profile.monitoringCount} monitoring prompts and ${profile.monitoringHistoryCount} graph points.`
      : `[seed] Netflix business profile already exists (${profile.profileId}); ${profile.monitoringCount} monitoring prompts and ${profile.monitoringHistoryCount} graph points.`,
  );
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
    ],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", businessRoutes);
app.route("/", competitiveRoutes);
app.route("/", llmStatusRoutes);

export default {
  port: Number(process.env.PORT ?? 3000),
  idleTimeout: Number(process.env.PERCEPTION_SERVER_IDLE_TIMEOUT ?? 255),
  fetch: app.fetch,
};
