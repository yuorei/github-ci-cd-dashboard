export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  owner: { login: string };
};

export type GitHubWorkflowRun = {
  id: number;
  workflow_id: number;
  name: string | null;
  run_number: number;
  run_attempt: number;
  event: string;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  actor: { login: string; avatar_url: string } | null;
  head_commit: { message: string } | null;
};

export type GitHubWorkflowJob = {
  id: number;
  run_id: number;
  name: string;
  status: string | null;
  conclusion: string | null;
  runner_name: string | null;
  runner_group_name: string | null;
  labels: string[];
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
  steps?: GitHubWorkflowStep[];
};

export type GitHubWorkflowStep = {
  name: string;
  number: number;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type WorkflowRunWebhookPayload = {
  action: string;
  repository: GitHubRepository;
  workflow_run: GitHubWorkflowRun;
};

export type WorkflowJobWebhookPayload = {
  action: string;
  repository: GitHubRepository;
  workflow_job: GitHubWorkflowJob;
};
