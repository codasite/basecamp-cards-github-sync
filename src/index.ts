import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import ui from "./routes/ui";
import webhook from "./routes/webhook";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use("/api/*", cors());

// Mount routes
app.route("/", ui);
app.route("/webhook", webhook);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
