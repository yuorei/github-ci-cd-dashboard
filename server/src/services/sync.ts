import { getRepositoryById, listRepositories, upsertRepository, type RepositoryRow } from "../repositories/repositoryRepository";
import { getWorkflowRunByGitHubId, upsertWorkflowRun } from "../repositories/workflowRunRepository";
import { upsertWorkflowJob, upsertWorkflowStep } from "../repositories/workflowJobRepository";
import type { GitHubRepository, GitHubWorkflowJob, GitHubWorkflowRun } from "../types/github";
import { nowIso } from "../utils/time";
import { GitHubClient } from "./github";

function mapRepository(input: GitHubRepository) {
  return {
    owner: input.owner.login,
    repo: input.name,
    github_repo_id: input.id,
    html_url: input.html_url,
    default_branch: input.default_branch,
  };
}

function mapWorkflowRun(run: GitHubWorkflowRun, repositoryId: number) {
  return {
    github_run_id: run.id,
    repository_id: repositoryId,
    workflow_id: run.workflow_id,
    workflow_name: run.name,
    run_number: run.run_number,
    run_attempt: run.run_attempt,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    head_sha: run.head_sha,
    commit_message: run.head_commit?.message ?? null,
    actor_login: run.actor?.login ?? null,
    actor_avatar_url: run.actor?.avatar_url ?? null,
    html_url: run.html_url,
    started_at: run.run_started_at ?? run.created_at,
    completed_at: run.status === "completed" ? run.updated_at : null,
  };
}

function mapWorkflowJob(job: GitHubWorkflowJob, workflowRunId: number) {
  return {
    github_job_id: job.id,
    workflow_run_id: workflowRunId,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    runner_name: job.runner_name,
    runner_group_name: job.runner_group_name,
    labels_json: JSON.stringify(job.labels ?? []),
    html_url: job.html_url,
    started_at: job.started_at,
    completed_at: job.completed_at,
  };
}

export async function syncWorkflowRun(db: D1Database, repository: RepositoryRow, run: GitHubWorkflowRun, jobs?: GitHubWorkflowJob[]) {
  const savedRun = await upsertWorkflowRun(db, mapWorkflowRun(run, repository.id));
  const workflowRunId = (savedRun as { id: number }).id;

  for (const job of jobs ?? []) {
    const savedJob = await upsertWorkflowJob(db, mapWorkflowJob(job, workflowRunId));
    for (const step of job.steps ?? []) {
      await upsertWorkflowStep(db, {
        workflow_job_id: savedJob.id,
        name: step.name,
        number: step.number,
        status: step.status,
        conclusion: step.conclusion,
        started_at: step.started_at,
        completed_at: step.completed_at,
      });
    }
  }

  return savedRun;
}

export async function syncRepository(db: D1Database, client: GitHubClient, repositoryId: number) {
  const repository = await getRepositoryById(db, repositoryId);
  if (!repository) throw new Error("Repository not found");

  const startedAt = nowIso();
  await db
    .prepare("INSERT INTO sync_logs (repository_id, sync_type, status, started_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(repository.id, "manual", "running", startedAt, startedAt)
    .run();

  try {
    const githubRepository = await client.getRepository(repository.owner, repository.repo);
    const savedRepository = await upsertRepository(db, mapRepository(githubRepository));
    const runs = await client.listWorkflowRuns(savedRepository.owner, savedRepository.repo, 50);

    let syncedRuns = 0;
    let syncedJobs = 0;
    for (const run of runs) {
      const jobs = await client.listWorkflowRunJobs(savedRepository.owner, savedRepository.repo, run.id);
      syncedJobs += jobs.length;
      await syncWorkflowRun(db, savedRepository, run, jobs);
      syncedRuns += 1;
    }

    await db
      .prepare(
        "UPDATE sync_logs SET status = ?, message = ?, completed_at = ? WHERE repository_id = ? AND started_at = ?"
      )
      .bind("success", `Synced ${syncedRuns} runs and ${syncedJobs} jobs`, nowIso(), repository.id, startedAt)
      .run();

    return { repository: savedRepository, synced_runs: syncedRuns, synced_jobs: syncedJobs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await db
      .prepare(
        "UPDATE sync_logs SET status = ?, message = ?, completed_at = ? WHERE repository_id = ? AND started_at = ?"
      )
      .bind("failed", message, nowIso(), repository.id, startedAt)
      .run();
    throw error;
  }
}

export async function syncAllRepositories(db: D1Database, client: GitHubClient) {
  const repositories = await listRepositories(db);
  const results = [];
  for (const repository of repositories.results) {
    results.push(await syncRepository(db, client, repository.id));
  }
  return results;
}

export async function saveWebhookWorkflowRun(db: D1Database, payload: { repository: GitHubRepository; workflow_run: GitHubWorkflowRun }) {
  const repository = await upsertRepository(db, mapRepository(payload.repository));
  return syncWorkflowRun(db, repository, payload.workflow_run);
}

export async function saveWebhookWorkflowJob(db: D1Database, payload: { repository: GitHubRepository; workflow_job: GitHubWorkflowJob }) {
  const repository = await upsertRepository(db, mapRepository(payload.repository));
  let runRow = await getWorkflowRunByGitHubId(db, payload.workflow_job.run_id);
  if (!runRow) {
    await upsertWorkflowRun(db, {
      github_run_id: payload.workflow_job.run_id,
      repository_id: repository.id,
      status: payload.workflow_job.status,
    });
    runRow = await getWorkflowRunByGitHubId(db, payload.workflow_job.run_id);
  }
  if (!runRow) throw new Error("Failed to create parent workflow run");

  const savedJob = await upsertWorkflowJob(db, mapWorkflowJob(payload.workflow_job, runRow.id));
  for (const step of payload.workflow_job.steps ?? []) {
    await upsertWorkflowStep(db, {
      workflow_job_id: savedJob.id,
      name: step.name,
      number: step.number,
      status: step.status,
      conclusion: step.conclusion,
      started_at: step.started_at,
      completed_at: step.completed_at,
    });
  }
  return savedJob;
}
