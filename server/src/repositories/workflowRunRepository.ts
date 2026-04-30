import { nowIso, secondsBetween } from "../utils/time";

export type WorkflowRunInput = {
  github_run_id: number;
  repository_id: number;
  workflow_id?: number | null;
  workflow_name?: string | null;
  run_number?: number | null;
  run_attempt?: number | null;
  event?: string | null;
  status?: string | null;
  conclusion?: string | null;
  branch?: string | null;
  head_sha?: string | null;
  commit_message?: string | null;
  actor_login?: string | null;
  actor_avatar_url?: string | null;
  html_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export async function upsertWorkflowRun(db: D1Database, input: WorkflowRunInput) {
  const now = nowIso();
  const duration = secondsBetween(input.started_at, input.completed_at);
  await db
    .prepare(
      `INSERT INTO workflow_runs (
        github_run_id, repository_id, workflow_id, workflow_name, run_number, run_attempt, event,
        status, conclusion, branch, head_sha, commit_message, actor_login, actor_avatar_url,
        html_url, started_at, completed_at, duration_seconds, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(github_run_id) DO UPDATE SET
        repository_id = excluded.repository_id,
        workflow_id = excluded.workflow_id,
        workflow_name = excluded.workflow_name,
        run_number = excluded.run_number,
        run_attempt = excluded.run_attempt,
        event = excluded.event,
        status = excluded.status,
        conclusion = excluded.conclusion,
        branch = excluded.branch,
        head_sha = excluded.head_sha,
        commit_message = excluded.commit_message,
        actor_login = excluded.actor_login,
        actor_avatar_url = excluded.actor_avatar_url,
        html_url = excluded.html_url,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        duration_seconds = excluded.duration_seconds,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.github_run_id,
      input.repository_id,
      input.workflow_id ?? null,
      input.workflow_name ?? null,
      input.run_number ?? null,
      input.run_attempt ?? null,
      input.event ?? null,
      input.status ?? null,
      input.conclusion ?? null,
      input.branch ?? null,
      input.head_sha ?? null,
      input.commit_message ?? null,
      input.actor_login ?? null,
      input.actor_avatar_url ?? null,
      input.html_url ?? null,
      input.started_at ?? null,
      input.completed_at ?? null,
      duration,
      now,
      now
    )
    .run();
  return db.prepare("SELECT * FROM workflow_runs WHERE github_run_id = ?").bind(input.github_run_id).first();
}

export async function getWorkflowRunById(db: D1Database, id: number) {
  return db
    .prepare(
      `SELECT wr.*, r.owner, r.repo, r.full_name AS repository_full_name
       FROM workflow_runs wr
       JOIN repositories r ON r.id = wr.repository_id
       WHERE wr.id = ?`
    )
    .bind(id)
    .first();
}

export async function getWorkflowRunByGitHubId(db: D1Database, githubRunId: number) {
  return db.prepare("SELECT * FROM workflow_runs WHERE github_run_id = ?").bind(githubRunId).first<{ id: number }>();
}
