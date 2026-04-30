PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  full_name TEXT NOT NULL,
  github_repo_id INTEGER,
  html_url TEXT,
  default_branch TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner, repo)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_run_id INTEGER NOT NULL,
  repository_id INTEGER NOT NULL,
  workflow_id INTEGER,
  workflow_name TEXT,
  run_number INTEGER,
  run_attempt INTEGER,
  event TEXT,
  status TEXT,
  conclusion TEXT,
  branch TEXT,
  head_sha TEXT,
  commit_message TEXT,
  actor_login TEXT,
  actor_avatar_url TEXT,
  html_url TEXT,
  started_at TEXT,
  completed_at TEXT,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(github_run_id),
  FOREIGN KEY(repository_id) REFERENCES repositories(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_repository_id ON workflow_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_conclusion ON workflow_runs(conclusion);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started_at ON workflow_runs(started_at);

CREATE TABLE IF NOT EXISTS workflow_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_job_id INTEGER NOT NULL,
  workflow_run_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  conclusion TEXT,
  runner_name TEXT,
  runner_group_name TEXT,
  labels_json TEXT,
  html_url TEXT,
  started_at TEXT,
  completed_at TEXT,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(github_job_id),
  FOREIGN KEY(workflow_run_id) REFERENCES workflow_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_workflow_run_id ON workflow_jobs(workflow_run_id);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_job_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  number INTEGER,
  status TEXT,
  conclusion TEXT,
  started_at TEXT,
  completed_at TEXT,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(workflow_job_id) REFERENCES workflow_jobs(id),
  UNIQUE(workflow_job_id, number, name)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_job_id ON workflow_steps(workflow_job_id);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id INTEGER,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_delivery_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT,
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(github_delivery_id)
);
