import { nowIso, secondsBetween } from "../utils/time";

export type WorkflowJobInput = {
  github_job_id: number;
  workflow_run_id: number;
  name: string;
  status?: string | null;
  conclusion?: string | null;
  runner_name?: string | null;
  runner_group_name?: string | null;
  labels_json?: string | null;
  html_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type WorkflowStepInput = {
  workflow_job_id: number;
  name: string;
  number?: number | null;
  status?: string | null;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export async function upsertWorkflowJob(db: D1Database, input: WorkflowJobInput) {
  const now = nowIso();
  const duration = secondsBetween(input.started_at, input.completed_at);
  await db
    .prepare(
      `INSERT INTO workflow_jobs (
        github_job_id, workflow_run_id, name, status, conclusion, runner_name, runner_group_name,
        labels_json, html_url, started_at, completed_at, duration_seconds, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(github_job_id) DO UPDATE SET
        workflow_run_id = excluded.workflow_run_id,
        name = excluded.name,
        status = excluded.status,
        conclusion = excluded.conclusion,
        runner_name = excluded.runner_name,
        runner_group_name = excluded.runner_group_name,
        labels_json = excluded.labels_json,
        html_url = excluded.html_url,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        duration_seconds = excluded.duration_seconds,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.github_job_id,
      input.workflow_run_id,
      input.name,
      input.status ?? null,
      input.conclusion ?? null,
      input.runner_name ?? null,
      input.runner_group_name ?? null,
      input.labels_json ?? null,
      input.html_url ?? null,
      input.started_at ?? null,
      input.completed_at ?? null,
      duration,
      now,
      now
    )
    .run();
  const row = await db.prepare("SELECT * FROM workflow_jobs WHERE github_job_id = ?").bind(input.github_job_id).first<{ id: number }>();
  if (!row) throw new Error("Failed to upsert workflow job");
  return row;
}

export async function upsertWorkflowStep(db: D1Database, input: WorkflowStepInput) {
  const now = nowIso();
  const duration = secondsBetween(input.started_at, input.completed_at);
  await db
    .prepare(
      `INSERT INTO workflow_steps (
        workflow_job_id, name, number, status, conclusion, started_at, completed_at,
        duration_seconds, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workflow_job_id, number, name) DO UPDATE SET
        status = excluded.status,
        conclusion = excluded.conclusion,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        duration_seconds = excluded.duration_seconds,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.workflow_job_id,
      input.name,
      input.number ?? null,
      input.status ?? null,
      input.conclusion ?? null,
      input.started_at ?? null,
      input.completed_at ?? null,
      duration,
      now,
      now
    )
    .run();
}
