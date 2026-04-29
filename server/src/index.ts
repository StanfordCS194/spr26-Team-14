import { Hono } from "hono";
import { cors } from "hono/cors";
import { accuracyRoutes } from "./routes/accuracy";
import { businessRoutes } from "./routes/business";
import { competitiveRoutes } from "./routes/competitive";

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
app.route("/", accuracyRoutes);

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
