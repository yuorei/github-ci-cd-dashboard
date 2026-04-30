import { Hono } from "hono";
import type { Env } from "../env";
import { deactivateRepository, listRepositories, upsertRepository } from "../repositories/repositoryRepository";
import { GitHubClient } from "../services/github";
import { syncRepository } from "../services/sync";
import { badRequest, notFound } from "../utils/response";

export const repositoriesRoute = new Hono<{ Bindings: Env }>();

repositoriesRoute.get("/", async (c) => {
  const includeInactive = c.req.query("include_inactive") === "true";
  const result = await listRepositories(c.env.DB, includeInactive);
  return c.json(result.results);
});

repositoriesRoute.post("/", async (c) => {
  const body = await c.req.json<{ owner?: string; repo?: string }>().catch(() => null);
  if (!body?.owner || !body.repo) return badRequest(c, "owner and repo are required");

  const client = new GitHubClient(c.env.GITHUB_TOKEN, c.env.GITHUB_API_BASE_URL);
  const githubRepository = await client.getRepository(body.owner, body.repo);
  const repository = await upsertRepository(c.env.DB, {
    owner: githubRepository.owner.login,
    repo: githubRepository.name,
    github_repo_id: githubRepository.id,
    html_url: githubRepository.html_url,
    default_branch: githubRepository.default_branch,
  });

  c.executionCtx.waitUntil(syncRepository(c.env.DB, client, repository.id));
  return c.json(repository, 201);
});

repositoriesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid repository id");
  const deleted = await deactivateRepository(c.env.DB, id);
  if (!deleted) return notFound(c, "Repository not found");
  return c.json({ ok: true });
});
