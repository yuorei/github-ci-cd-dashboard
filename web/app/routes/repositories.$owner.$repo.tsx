import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppLayout, EmptyState, ErrorNotice, PageHeader } from "../components/Layout";
import { api, type Repository, type WorkflowRun } from "../lib/api";
import { badgeClass, formatDate, formatDuration, shortSha, statusLabel } from "../lib/format";

export function meta() {
  return [{ title: "Repository | Actions Monitor" }];
}

export default function RepositoryDetail() {
  const { owner, repo } = useParams();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const repository = useMemo(
    () => repositories.find((item) => item.owner === owner && item.repo === repo),
    [owner, repo, repositories]
  );
  const latestRun = runs[0];

  async function load() {
    if (!owner || !repo) return;
    setError(null);
    try {
      const [nextRepositories, nextRuns] = await Promise.all([
        api.repositories(true),
        api.runs(`?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`),
      ]);
      setRepositories(nextRepositories);
      setRuns(nextRuns);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    }
  }

  useEffect(() => {
    void load();
  }, [owner, repo]);

  async function sync() {
    if (!repository) return;
    setSyncing(true);
    setError(null);
    try {
      await api.syncRepository(repository.id);
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
        title={`${owner}/${repo}`}
        description="Workflow Run の履歴と最新状態を確認します。"
        action={
          <button className="button primary" onClick={sync} disabled={!repository || syncing}>
            {syncing ? "同期中" : "手動同期"}
          </button>
        }
      />
      {error ? <ErrorNotice message={error} /> : null}

      <section className="info-grid">
        <Info label="GitHub" value={repository?.html_url ? <a href={repository.html_url}>リポジトリを開く</a> : "-"} />
        <Info label="Default Branch" value={repository?.default_branch ?? "-"} />
        <Info label="Latest Sync" value={formatDate(repository?.updated_at)} />
        <Info
          label="Latest Run"
          value={latestRun ? <span className={badgeClass(latestRun.conclusion ?? latestRun.status)}>{statusLabel(latestRun.conclusion ?? latestRun.status)}</span> : "-"}
        />
      </section>

      <section className="table-section">
        <div className="section-title">
          <h2>Workflow Runs</h2>
          <span>{runs.length} 件</span>
        </div>
        {runs.length === 0 ? (
          <EmptyState title="Run がありません" body="同期が完了すると、このリポジトリの履歴が表示されます。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Run</th>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Event</th>
                  <th>Branch</th>
                  <th>Commit</th>
                  <th>Actor</th>
                  <th>Started</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link to={`/runs/${run.id}`}>{run.workflow_name ?? "-"}</Link>
                      <small>{run.commit_message ?? ""}</small>
                    </td>
                    <td>{run.run_number ?? "-"}</td>
                    <td>{run.run_attempt ?? "-"}</td>
                    <td><span className={badgeClass(run.status)}>{statusLabel(run.status)}</span></td>
                    <td><span className={badgeClass(run.conclusion)}>{statusLabel(run.conclusion)}</span></td>
                    <td>{run.event ?? "-"}</td>
                    <td>{run.branch ?? "-"}</td>
                    <td>{shortSha(run.head_sha)}</td>
                    <td>{run.actor_login ?? "-"}</td>
                    <td>{formatDate(run.started_at)}</td>
                    <td>{formatDuration(run.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
