import { Hono } from "hono";
import type { Env } from "../env";
import { GitHubClient } from "../services/github";
import { syncAllRepositories, syncRepository } from "../services/sync";
import { badRequest } from "../utils/response";

export const syncRoute = new Hono<{ Bindings: Env }>();

syncRoute.post("/repositories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid repository id");
  const client = new GitHubClient(c.env.GITHUB_TOKEN, c.env.GITHUB_API_BASE_URL);
  return c.json(await syncRepository(c.env.DB, client, id));
});

syncRoute.post("/all", async (c) => {
  const client = new GitHubClient(c.env.GITHUB_TOKEN, c.env.GITHUB_API_BASE_URL);
  return c.json(await syncAllRepositories(c.env.DB, client));
});
