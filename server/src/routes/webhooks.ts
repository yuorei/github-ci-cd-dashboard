import { Hono } from "hono";
import type { Env } from "../env";
import { processGitHubWebhook } from "../services/webhook";
import { badRequest } from "../utils/response";
import { verifyGitHubSignature } from "../utils/githubWebhook";

export const webhooksRoute = new Hono<{ Bindings: Env }>();

webhooksRoute.post("/github", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("X-Hub-Signature-256") ?? null;
  const verified = await verifyGitHubSignature(c.env.GITHUB_WEBHOOK_SECRET, body, signature);
  if (!verified) return c.json({ error: "Invalid signature" }, 401);

  const deliveryId = c.req.header("X-GitHub-Delivery");
  const eventType = c.req.header("X-GitHub-Event");
  if (!deliveryId || !eventType) return badRequest(c, "Missing GitHub webhook headers");

  const result = await processGitHubWebhook(c.env.DB, deliveryId, eventType, body);
  return c.json(result);
});
