import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { dashboardRoute } from "./routes/dashboard";
import { jobsRoute } from "./routes/jobs";
import { repositoriesRoute } from "./routes/repositories";
import { runsRoute } from "./routes/runs";
import { syncRoute } from "./routes/sync";
import { webhooksRoute } from "./routes/webhooks";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const allowedOrigin = c.env.ALLOWED_ORIGIN;
      if (!allowedOrigin) return "";
      return origin === allowedOrigin ? origin : "";
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

app.get("/", (c) => c.json({ name: "GitHub Actions CI/CD Dashboard API", ok: true }));
app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/repositories", repositoriesRoute);
app.route("/api/dashboard", dashboardRoute);
app.route("/api/runs", runsRoute);
app.route("/api/jobs", jobsRoute);
app.route("/api/sync", syncRoute);
app.route("/api/webhooks", webhooksRoute);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: error.message }, 500);
});

export default app;
