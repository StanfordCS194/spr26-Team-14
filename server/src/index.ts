import { Hono } from "hono";
import { cors } from "hono/cors";
import { businessRoutes } from "./routes/business";
import { competitiveRoutes } from "./routes/competitive";
import { llmStatusRoutes } from "./routes/llm-status";

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
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", businessRoutes);
app.route("/", competitiveRoutes);
app.route("/", llmStatusRoutes);

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
