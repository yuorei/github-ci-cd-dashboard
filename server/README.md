# Server

## 用意するもの

- Node.js
- npm
- Cloudflare アカウント
- Wrangler にログイン済みの環境
- Cloudflare D1 database
- GitHub Personal Access Token
- GitHub Webhook Secret

## 設定

```bash
npm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` を設定します。

```env
GITHUB_TOKEN=github_pat_xxx
GITHUB_WEBHOOK_SECRET=change_me
ALLOWED_ORIGIN=http://localhost:5173
```

`wrangler.toml` の `database_id` を実際の D1 database ID に変更します。

```bash
npm run db:migrate:local
```

## 起動

```bash
npm run dev -- --port 8787
```
