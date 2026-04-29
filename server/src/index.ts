import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadStreamingSeed } from "../seed/streaming";
import { businessRoutes } from "./routes/business";
import { competitiveRoutes } from "./routes/competitive";

if ((process.env.PERCEPTION_DEMO_SEED ?? "1") !== "0") {
  const summary = loadStreamingSeed();
  console.log(
    `[seed] Loaded streaming demo cohort: ${summary.promptRunCount} prompt runs, ${summary.comparisonCount} comparisons, ${summary.gapEventCount} gap events.`,
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
