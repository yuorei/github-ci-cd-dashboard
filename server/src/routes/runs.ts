import { Hono } from "hono";
import type { Env } from "../env";
import { getWorkflowRunById } from "../repositories/workflowRunRepository";
import { badRequest, notFound, parsePagination } from "../utils/response";

export const runsRoute = new Hono<{ Bindings: Env }>();

runsRoute.get("/", async (c) => {
  const { limit, offset } = parsePagination(c.req.query());
  const filters: string[] = [];
  const values: unknown[] = [];

  for (const [column, query] of [
    ["wr.repository_id", "repository_id"],
    ["r.owner", "owner"],
    ["r.repo", "repo"],
    ["wr.status", "status"],
    ["wr.conclusion", "conclusion"],
    ["wr.branch", "branch"],
    ["wr.event", "event"],
    ["wr.actor_login", "actor"],
  ] as const) {
    const value = c.req.query(query);
    if (value) {
      filters.push(`${column} = ?`);
      values.push(query === "repository_id" ? Number(value) : value);
    }
  }

  const from = c.req.query("from");
  const to = c.req.query("to");
  if (from) {
    filters.push("wr.started_at >= ?");
    values.push(from);
  }
  if (to) {
    filters.push("wr.started_at <= ?");
    values.push(to);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await c.env.DB
    .prepare(
      `SELECT wr.*, r.owner, r.repo, r.full_name AS repository_full_name
       FROM workflow_runs wr
       JOIN repositories r ON r.id = wr.repository_id
       ${where}
       ORDER BY wr.started_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...values, limit, offset)
    .all();
  return c.json(result.results);
});

runsRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid run id");
  const run = await getWorkflowRunById(c.env.DB, id);
  if (!run) return notFound(c, "Workflow run not found");
  return c.json(run);
});

runsRoute.get("/:id/jobs", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return badRequest(c, "Invalid run id");
  const result = await c.env.DB
    .prepare(
      `SELECT j.*,
        (SELECT COUNT(*) FROM workflow_steps s WHERE s.workflow_job_id = j.id) AS step_count,
        (SELECT COUNT(*) FROM workflow_steps s WHERE s.workflow_job_id = j.id AND s.conclusion = 'success') AS successful_step_count
       FROM workflow_jobs j
       WHERE j.workflow_run_id = ?
       ORDER BY j.started_at, j.id`
    )
    .bind(id)
    .all();
  return c.json(result.results);
});
