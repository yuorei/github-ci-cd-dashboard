const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

export type Summary = {
  repository_count: number;
  running_count: number;
  failed_count: number;
  success_count_24h: number;
  failure_count_24h: number;
  average_duration_seconds_24h: number;
};

export type Repository = {
  id: number;
  owner: string;
  repo: string;
  full_name: string;
  github_repo_id: number | null;
  html_url: string | null;
  default_branch: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowRun = {
  id: number;
  github_run_id: number;
  repository_id: number;
  repository_full_name?: string;
  owner?: string;
  repo?: string;
  workflow_name: string | null;
  run_number: number | null;
  run_attempt: number | null;
  event: string | null;
  status: string | null;
  conclusion: string | null;
  branch: string | null;
  head_sha: string | null;
  commit_message: string | null;
  actor_login: string | null;
  actor_avatar_url: string | null;
  html_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
};

export type WorkflowJob = {
  id: number;
  github_job_id: number;
  workflow_run_id: number;
  name: string;
  status: string | null;
  conclusion: string | null;
  runner_name: string | null;
  runner_group_name: string | null;
  html_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  step_count?: number;
  successful_step_count?: number;
};

export type WorkflowStep = {
  id: number;
  workflow_job_id: number;
  name: string;
  number: number | null;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function requestText(path: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.text();
}

export const api = {
  summary: () => request<Summary>("/api/dashboard/summary"),
  latestRuns: (query = "") => request<WorkflowRun[]>(`/api/dashboard/latest-runs${query}`),
  repositories: (includeInactive = false) =>
    request<Repository[]>(`/api/repositories${includeInactive ? "?include_inactive=true" : ""}`),
  addRepository: (owner: string, repo: string) =>
    request<Repository>("/api/repositories", {
      method: "POST",
      body: JSON.stringify({ owner, repo }),
    }),
  deactivateRepository: (id: number) => request<{ ok: true }>(`/api/repositories/${id}`, { method: "DELETE" }),
  syncRepository: (id: number) => request(`/api/sync/repositories/${id}`, { method: "POST" }),
  syncAll: () => request("/api/sync/all", { method: "POST" }),
  runs: (query = "") => request<WorkflowRun[]>(`/api/runs${query}`),
  run: (id: string | number) => request<WorkflowRun>(`/api/runs/${id}`),
  runJobs: (id: string | number) => request<WorkflowJob[]>(`/api/runs/${id}/jobs`),
  jobSteps: (id: string | number) => request<WorkflowStep[]>(`/api/jobs/${id}/steps`),
  jobLogs: (id: string | number) => requestText(`/api/jobs/${id}/logs`),
};
