import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router";
import { AppLayout, EmptyState, ErrorNotice, PageHeader } from "../components/Layout";
import { api, type WorkflowJob, type WorkflowRun, type WorkflowStep } from "../lib/api";
import { badgeClass, formatDate, formatDuration, shortSha, statusLabel } from "../lib/format";

export function meta() {
  return [{ title: "Run Detail | Actions Monitor" }];
}

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [stepsByJob, setStepsByJob] = useState<Record<number, WorkflowStep[]>>({});
  const [logsByJob, setLogsByJob] = useState<Record<number, string>>({});
  const [loadingLogJobId, setLoadingLogJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const runId = id;
    async function load() {
      setError(null);
      try {
        const [nextRun, nextJobs] = await Promise.all([api.run(runId), api.runJobs(runId)]);
        setRun(nextRun);
        setJobs(nextJobs);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
      }
    }
    void load();
  }, [id]);

  async function toggleJob(jobId: number) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    if (stepsByJob[jobId]) return;
    try {
      const steps = await api.jobSteps(jobId);
      setStepsByJob((current) => ({ ...current, [jobId]: steps }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Step 読み込みに失敗しました");
    }
  }

  async function loadLogs(jobId: number) {
    setLoadingLogJobId(jobId);
    setError(null);
    try {
      const logs = await api.jobLogs(jobId);
      setLogsByJob((current) => ({ ...current, [jobId]: logs }));
      if (expandedJobId !== jobId) {
        await toggleJob(jobId);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ログ読み込みに失敗しました");
    } finally {
      setLoadingLogJobId(null);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title={run?.workflow_name ?? "Workflow Run"}
        description={run?.repository_full_name ? `${run.repository_full_name} #${run.run_number ?? "-"}` : "Run detail"}
        action={run?.html_url ? <a className="button primary" href={run.html_url}>GitHubで開く</a> : null}
      />
      {error ? <ErrorNotice message={error} /> : null}

      {run ? (
        <>
          <RunFlow run={run} jobs={jobs} />
          <section className="info-grid wide">
            <Info label="Repository" value={run.repository_full_name ?? "-"} />
            <Info label="Run ID" value={run.github_run_id} />
            <Info label="Attempt" value={run.run_attempt ?? "-"} />
            <Info label="Status" value={<span className={badgeClass(run.status)}>{statusLabel(run.status)}</span>} />
            <Info label="Conclusion" value={<span className={badgeClass(run.conclusion)}>{statusLabel(run.conclusion)}</span>} />
            <Info label="Branch" value={run.branch ?? "-"} />
            <Info label="Event" value={run.event ?? "-"} />
            <Info label="Actor" value={run.actor_login ?? "-"} />
            <Info label="Commit" value={shortSha(run.head_sha)} />
            <Info label="Started" value={formatDate(run.started_at)} />
            <Info label="Completed" value={formatDate(run.completed_at)} />
            <Info label="Duration" value={formatDuration(run.duration_seconds)} />
          </section>
        </>
      ) : null}

      <section className="commit-message">
        <span>Commit Message</span>
        <p>{run?.commit_message ?? "-"}</p>
      </section>

      <section className="table-section">
        <div className="section-title">
          <h2>Jobs</h2>
          <span>{jobs.length} 件</span>
        </div>
        {jobs.length === 0 ? (
          <EmptyState title="Job がありません" body="Job 情報が同期されると、この一覧に表示されます。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Runner</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Steps</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <Fragment key={job.id}>
                    <tr key={job.id} className="clickable-row" onClick={() => void toggleJob(job.id)}>
                      <td>{job.name}</td>
                      <td><span className={badgeClass(job.status)}>{statusLabel(job.status)}</span></td>
                      <td><span className={badgeClass(job.conclusion)}>{statusLabel(job.conclusion)}</span></td>
                      <td>{job.runner_name ?? "-"}</td>
                      <td>{formatDate(job.started_at)}</td>
                      <td>{formatDuration(job.duration_seconds)}</td>
                      <td>{job.successful_step_count ?? 0} / {job.step_count ?? 0}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button small"
                            onClick={(event) => {
                              event.stopPropagation();
                              void loadLogs(job.id);
                            }}
                            disabled={loadingLogJobId === job.id}
                          >
                            {loadingLogJobId === job.id ? "読込中" : "ログ"}
                          </button>
                          {job.html_url ? <a href={job.html_url} onClick={(event) => event.stopPropagation()}>GitHub</a> : null}
                        </div>
                      </td>
                    </tr>
                    {expandedJobId === job.id ? (
                      <tr>
                        <td colSpan={8}>
                          <StepTable steps={stepsByJob[job.id] ?? []} />
                          {logsByJob[job.id] ? <LogViewer logs={logsByJob[job.id]} /> : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function RunFlow({ run, jobs }: { run: WorkflowRun; jobs: WorkflowJob[] }) {
  const runState = run.conclusion ?? run.status;
  const failedJobs = jobs.filter((job) => job.conclusion === "failure").length;
  const successfulJobs = jobs.filter((job) => job.conclusion === "success").length;

  return (
    <section className="flow-panel">
      <div className="section-title">
        <h2>State Flow</h2>
        <span>{successfulJobs} success / {failedJobs} failed / {jobs.length} jobs</span>
      </div>
      <div className="flow-track">
        <FlowNode label="Requested" state="success" detail={run.event ?? "-"} />
        <FlowNode label="Queued" state={flowState(run.status, runState, "queued")} detail={run.branch ?? "-"} />
        <FlowNode label="In Progress" state={flowState(run.status, runState, "in_progress")} detail={formatDate(run.started_at)} />
        <FlowNode label="Jobs" state={failedJobs > 0 ? "failure" : jobs.length > 0 ? "success" : "pending"} detail={`${jobs.length} jobs`} />
        <FlowNode label="Completed" state={runState ?? "pending"} detail={formatDuration(run.duration_seconds)} />
      </div>
    </section>
  );
}

function FlowNode({ label, state, detail }: { label: string; state?: string | null; detail: string }) {
  return (
    <div className={`flow-node ${nodeClass(state)}`}>
      <span className="flow-dot" />
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function flowState(currentStatus: string | null, finalState: string | null, target: string) {
  if (currentStatus === target) return "in_progress";
  if (finalState === "failure" || finalState === "timed_out" || finalState === "cancelled") return finalState;
  if (currentStatus === "completed" || finalState === "success") return "success";
  return "pending";
}

function nodeClass(state?: string | null) {
  if (state === "success") return "success";
  if (state === "failure" || state === "timed_out" || state === "cancelled") return "failure";
  if (state === "in_progress" || state === "queued") return "running";
  return "pending";
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StepTable({ steps }: { steps: WorkflowStep[] }) {
  if (steps.length === 0) {
    return <EmptyState title="Step がありません" body="Step 詳細が同期されていません。" />;
  }
  return (
    <div className="steps-panel">
      <table>
        <thead>
          <tr>
            <th>Step Name</th>
            <th>Number</th>
            <th>Status</th>
            <th>Conclusion</th>
            <th>Started</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.id}>
              <td>{step.name}</td>
              <td>{step.number ?? "-"}</td>
              <td><span className={badgeClass(step.status)}>{statusLabel(step.status)}</span></td>
              <td><span className={badgeClass(step.conclusion)}>{statusLabel(step.conclusion)}</span></td>
              <td>{formatDate(step.started_at)}</td>
              <td>{formatDuration(step.duration_seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogViewer({ logs }: { logs: string }) {
  return (
    <section className="log-viewer">
      <div className="section-title">
        <h2>Logs</h2>
        <span>{logs.length.toLocaleString()} chars</span>
      </div>
      <pre>{logs}</pre>
    </section>
  );
}
