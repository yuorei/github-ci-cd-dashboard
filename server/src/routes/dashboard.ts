import { Hono } from "hono";
import type { Env } from "../env";
import { parsePagination } from "../utils/response";

export const dashboardRoute = new Hono<{ Bindings: Env }>();

type CountRow = { count: number };
type AverageRow = { value: number | null };

dashboardRoute.get("/summary", async (c) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [repositoryCount, runningCount, failedCount, success24h, failure24h, averageDuration24h] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM repositories WHERE is_active = 1"),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM workflow_runs WHERE status IN ('queued', 'in_progress')"),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM workflow_runs WHERE status = 'completed' AND conclusion = 'failure'"),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM workflow_runs WHERE conclusion = 'success' AND completed_at >= ?").bind(since),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM workflow_runs WHERE conclusion = 'failure' AND completed_at >= ?").bind(since),
    c.env.DB.prepare("SELECT AVG(duration_seconds) AS value FROM workflow_runs WHERE completed_at >= ? AND duration_seconds IS NOT NULL").bind(since),
  ]);

  const repositoryCountRow = repositoryCount.results[0] as CountRow | undefined;
  const runningCountRow = runningCount.results[0] as CountRow | undefined;
  const failedCountRow = failedCount.results[0] as CountRow | undefined;
  const success24hRow = success24h.results[0] as CountRow | undefined;
  const failure24hRow = failure24h.results[0] as CountRow | undefined;
  const averageDuration24hRow = averageDuration24h.results[0] as AverageRow | undefined;

  return c.json({
    repository_count: Number(repositoryCountRow?.count ?? 0),
    running_count: Number(runningCountRow?.count ?? 0),
    failed_count: Number(failedCountRow?.count ?? 0),
    success_count_24h: Number(success24hRow?.count ?? 0),
    failure_count_24h: Number(failure24hRow?.count ?? 0),
    average_duration_seconds_24h: Math.round(Number(averageDuration24hRow?.value ?? 0)),
  });
});

dashboardRoute.get("/latest-runs", async (c) => {
  const { limit, offset } = parsePagination(c.req.query());
  const filters = ["r.is_active = 1"];
  const values: unknown[] = [];

  for (const [column, query] of [
    ["wr.status", "status"],
    ["wr.conclusion", "conclusion"],
    ["r.owner", "owner"],
    ["r.repo", "repo"],
    ["wr.branch", "branch"],
  ] as const) {
    const value = c.req.query(query);
    if (value) {
      filters.push(`${column} = ?`);
      values.push(value);
    }
  }

  const sql = `
    SELECT wr.*, r.owner, r.repo, r.full_name AS repository_full_name
    FROM workflow_runs wr
    JOIN repositories r ON r.id = wr.repository_id
    JOIN (
      SELECT repository_id, MAX(started_at) AS latest_started_at
      FROM workflow_runs
      GROUP BY repository_id
    ) latest ON latest.repository_id = wr.repository_id AND latest.latest_started_at = wr.started_at
    WHERE ${filters.join(" AND ")}
    ORDER BY wr.started_at DESC
    LIMIT ? OFFSET ?`;

  const result = await c.env.DB.prepare(sql).bind(...values, limit, offset).all();
  return c.json(result.results);
});
