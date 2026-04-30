import { nowIso } from "../utils/time";

export type RepositoryInput = {
  owner: string;
  repo: string;
  github_repo_id?: number | null;
  html_url?: string | null;
  default_branch?: string | null;
};

export type RepositoryRow = RepositoryInput & {
  id: number;
  full_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export async function listRepositories(db: D1Database, includeInactive = false) {
  const sql = includeInactive
    ? "SELECT * FROM repositories ORDER BY owner, repo"
    : "SELECT * FROM repositories WHERE is_active = 1 ORDER BY owner, repo";
  return db.prepare(sql).all<RepositoryRow>();
}

export async function getRepositoryById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM repositories WHERE id = ?").bind(id).first<RepositoryRow>();
}

export async function getRepositoryByFullName(db: D1Database, owner: string, repo: string) {
  return db
    .prepare("SELECT * FROM repositories WHERE owner = ? COLLATE NOCASE AND repo = ? COLLATE NOCASE")
    .bind(owner, repo)
    .first<RepositoryRow>();
}

export async function upsertRepository(db: D1Database, input: RepositoryInput) {
  const now = nowIso();
  const fullName = `${input.owner}/${input.repo}`;
  await db
    .prepare(
      `INSERT INTO repositories (owner, repo, full_name, github_repo_id, html_url, default_branch, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(owner, repo) DO UPDATE SET
        full_name = excluded.full_name,
        github_repo_id = COALESCE(excluded.github_repo_id, repositories.github_repo_id),
        html_url = COALESCE(excluded.html_url, repositories.html_url),
        default_branch = COALESCE(excluded.default_branch, repositories.default_branch),
        is_active = 1,
        updated_at = excluded.updated_at`
    )
    .bind(input.owner, input.repo, fullName, input.github_repo_id ?? null, input.html_url ?? null, input.default_branch ?? null, now, now)
    .run();
  const row = await getRepositoryByFullName(db, input.owner, input.repo);
  if (!row) throw new Error("Failed to upsert repository");
  return row;
}

export async function deactivateRepository(db: D1Database, id: number) {
  const result = await db
    .prepare("UPDATE repositories SET is_active = 0, updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();
  return result.meta.changes > 0;
}
