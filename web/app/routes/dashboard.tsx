import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AppLayout, EmptyState, ErrorNotice, PageHeader } from "../components/Layout";
import { api, type Summary, type WorkflowRun } from "../lib/api";
import { badgeClass, formatDate, formatDuration, shortSha, statusLabel } from "../lib/format";

type Filters = {
  search: string;
  status: string;
  conclusion: string;
  branch: string;
};

export function meta() {
  return [{ title: "Dashboard | Actions Monitor" }];
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: "", status: "", conclusion: "", branch: "" });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const query = new URLSearchParams();
    if (filters.status) query.set("status", filters.status);
    if (filters.conclusion) query.set("conclusion", filters.conclusion);
    if (filters.branch) query.set("branch", filters.branch);
    const suffix = query.size ? `?${query.toString()}` : "";

    try {
      const [nextSummary, nextRuns] = await Promise.all([api.summary(), api.latestRuns(suffix)]);
      setSummary(nextSummary);
      setRuns(nextRuns);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filters.status, filters.conclusion, filters.branch]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, filters.status, filters.conclusion, filters.branch]);

  const visibleRuns = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    if (!keyword) return runs;
    return runs.filter((run) => `${run.repository_full_name ?? ""} ${run.workflow_name ?? ""}`.toLowerCase().includes(keyword));
  }, [filters.search, runs]);

  async function syncAll() {
    setSyncing(true);
    setError(null);
    try {
      await api.syncAll();
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Applications"
        description="GitHub Actions の最新状態をアプリケーション単位で監視します。"
        action={
          <>
            <label className="toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              自動更新
            </label>
            <button className="button primary" onClick={syncAll} disabled={syncing}>
              {syncing ? "同期中" : "全同期"}
            </button>
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <section className="argo-summary">
        <SummaryCard label="Apps" value={summary?.repository_count} />
        <SummaryCard label="Running" value={summary?.running_count} tone="running" />
        <SummaryCard label="Degraded" value={summary?.failed_count} tone="danger" />
        <SummaryCard label="Healthy 24h" value={summary?.success_count_24h} tone="success" />
        <SummaryCard label="Failed 24h" value={summary?.failure_count_24h} tone="danger" />
        <SummaryCard label="Avg Duration" value={formatDuration(summary?.average_duration_seconds_24h ?? null)} />
      </section>

      <section className="argo-toolbar">
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="Repository / Workflow を検索"
        />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">Status 全て</option>
          <option value="queued">queued</option>
          <option value="in_progress">in_progress</option>
          <option value="completed">completed</option>
        </select>
        <select
          value={filters.conclusion}
          onChange={(event) => setFilters((current) => ({ ...current, conclusion: event.target.value }))}
        >
          <option value="">Conclusion 全て</option>
          <option value="success">success</option>
          <option value="failure">failure</option>
          <option value="cancelled">cancelled</option>
          <option value="skipped">skipped</option>
        </select>
        <input
          value={filters.branch}
          onChange={(event) => setFilters((current) => ({ ...current, branch: event.target.value }))}
          placeholder="Branch"
        />
      </section>

      <section className="table-section">
        <div className="section-title">
          <h2>Applications</h2>
          <span>{loading ? "読み込み中" : `${visibleRuns.length} 件`}</span>
        </div>
        {visibleRuns.length === 0 ? (
          <EmptyState title="Run がありません" body="リポジトリを追加して同期すると、ここに最新状態が表示されます。" />
        ) : (
          <div className="app-grid">
            {visibleRuns.map((run) => (
              <article className={`app-card ${healthClass(run)}`} key={run.id}>
                <div className="app-card-header">
                  <div className="app-icon">{appInitial(run.repository_full_name)}</div>
                  <div className="app-title">
                    <Link to={`/repositories/${run.owner}/${run.repo}`}>{run.repository_full_name}</Link>
                    <span>{run.workflow_name ?? "-"}</span>
                  </div>
                  <span className="sync-dot" aria-label={statusLabel(run.conclusion ?? run.status)} />
                </div>

                <div className="app-status-row">
                  <StatusPill label="Health" value={run.conclusion ?? run.status} />
                  <StatusPill label="Sync" value={run.status} />
                </div>

                <dl className="app-meta">
                  <div>
                    <dt>Branch</dt>
                    <dd>{run.branch ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Revision</dt>
                    <dd>{shortSha(run.head_sha)}</dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{formatDate(run.started_at)}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{formatDuration(run.duration_seconds)}</dd>
                  </div>
                </dl>

                <div className="app-card-footer">
                  <span>{run.actor_login ?? "-"}</span>
                  <div className="app-links">
                    <Link to={`/runs/${run.id}`}>Details</Link>
                    {run.html_url ? <a href={run.html_url}>GitHub</a> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value?: number | string; tone?: "running" | "danger" | "success" }) {
  return (
    <div className={`summary-card ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="status-pill">
      <span>{label}</span>
      <strong className={badgeClass(value)}>{statusLabel(value)}</strong>
    </div>
  );
}

function healthClass(run: WorkflowRun) {
  const value = run.conclusion ?? run.status;
  if (value === "success") return "healthy";
  if (value === "failure" || value === "timed_out" || value === "action_required") return "degraded";
  if (value === "queued" || value === "in_progress") return "progressing";
  return "unknown";
}

function appInitial(fullName?: string) {
  const name = fullName?.split("/").at(-1) ?? "A";
  return name.slice(0, 2).toUpperCase();
}
