import { Hono } from "hono";
import type { Env } from "../env";
import { GitHubClient } from "../services/github";
import { badRequest, notFound } from "../utils/response";

export const jobsRoute = new Hono<{ Bindings: Env }>();

jobsRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid job id");
  const job = await c.env.DB.prepare("SELECT * FROM workflow_jobs WHERE id = ?").bind(id).first();
  if (!job) return notFound(c, "Workflow job not found");
  return c.json(job);
});

jobsRoute.get("/:id/steps", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid job id");
  const result = await c.env.DB
    .prepare("SELECT * FROM workflow_steps WHERE workflow_job_id = ? ORDER BY number, id")
    .bind(id)
    .all();
  return c.json(result.results);
});

jobsRoute.get("/:id/logs", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid job id");

  const job = await c.env.DB
    .prepare(
      `SELECT j.github_job_id, r.owner, r.repo
       FROM workflow_jobs j
       JOIN workflow_runs wr ON wr.id = j.workflow_run_id
       JOIN repositories r ON r.id = wr.repository_id
       WHERE j.id = ?`
    )
    .bind(id)
    .first<{ github_job_id: number; owner: string; repo: string }>();
  if (!job) return notFound(c, "Workflow job not found");

  const client = new GitHubClient(c.env.GITHUB_TOKEN, c.env.GITHUB_API_BASE_URL);
  const logs = await client.getWorkflowJobLogs(job.owner, job.repo, job.github_job_id);
  return c.text(logs, 200, { "Content-Type": "text/plain; charset=utf-8" });
});
