import { useEffect, useState } from "react";
import { AppLayout, EmptyState, ErrorNotice, PageHeader } from "../components/Layout";
import { api, type Repository } from "../lib/api";
import { formatDate } from "../lib/format";

export function meta() {
  return [{ title: "Repositories | Actions Monitor" }];
}

export default function RepositorySettings() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRepositories(await api.repositories(true));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addRepository(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.addRepository(owner.trim(), repo.trim());
      setOwner("");
      setRepo("");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function sync(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.syncRepository(id);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "同期に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.deactivateRepository(id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "無効化に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <PageHeader title="Repository Settings" description="監視対象リポジトリを追加、同期、無効化します。" />
      {error ? <ErrorNotice message={error} /> : null}

      <form className="inline-form" onSubmit={addRepository}>
        <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="owner" required />
        <input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="repo" required />
        <button className="button primary" disabled={submitting}>
          {submitting ? "追加中" : "追加"}
        </button>
      </form>

      <section className="table-section">
        <div className="section-title">
          <h2>監視対象</h2>
          <span>{loading ? "読み込み中" : `${repositories.length} 件`}</span>
        </div>
        {repositories.length === 0 ? (
          <EmptyState title="リポジトリがありません" body="owner と repo を入力して監視対象を追加してください。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Active</th>
                  <th>GitHub Repo ID</th>
                  <th>Default Branch</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repositories.map((repository) => (
                  <tr key={repository.id}>
                    <td>
                      {repository.html_url ? <a href={repository.html_url}>{repository.full_name}</a> : repository.full_name}
                    </td>
                    <td>{repository.is_active ? "監視中" : "無効"}</td>
                    <td>{repository.github_repo_id ?? "-"}</td>
                    <td>{repository.default_branch ?? "-"}</td>
                    <td>{formatDate(repository.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="button small" onClick={() => void sync(repository.id)} disabled={busyId === repository.id}>
                          同期
                        </button>
                        <button className="button small danger" onClick={() => void deactivate(repository.id)} disabled={busyId === repository.id}>
                          無効化
                        </button>
                      </div>
                    </td>
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
