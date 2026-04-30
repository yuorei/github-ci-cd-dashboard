import type { GitHubRepository, GitHubWorkflowJob, GitHubWorkflowRun } from "../types/github";

type ListRunsResponse = {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
};

type ListJobsResponse = {
  total_count: number;
  jobs: GitHubWorkflowJob[];
};

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string, baseUrl = "https://api.github.com") {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getRepository(owner: string, repo: string) {
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  async listWorkflowRuns(owner: string, repo: string, perPage = 50) {
    const data = await this.request<ListRunsResponse>(`/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`);
    return data.workflow_runs;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    return this.request<GitHubWorkflowRun>(`/repos/${owner}/${repo}/actions/runs/${runId}`);
  }

  async listWorkflowRunJobs(owner: string, repo: string, runId: number) {
    const data = await this.request<ListJobsResponse>(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100`);
    return data.jobs;
  }

  async getWorkflowJob(owner: string, repo: string, jobId: number) {
    return this.request<GitHubWorkflowJob>(`/repos/${owner}/${repo}/actions/jobs/${jobId}`);
  }

  async getWorkflowJobLogs(owner: string, repo: string, jobId: number) {
    if (!this.token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
      redirect: "follow",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "github-actions-dashboard",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    return response.text();
  }

  private async request<T>(path: string): Promise<T> {
    if (!this.token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "github-actions-dashboard",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    return response.json<T>();
  }
}
