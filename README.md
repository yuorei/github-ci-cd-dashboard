# GitHub CI/CD Dashboard

## 用意するもの

- Node.js
- npm
- Cloudflare アカウント
- Wrangler にログイン済みの環境
- Cloudflare D1 database
- GitHub Personal Access Token
- GitHub Webhook Secret

## 設定

### server

```bash
cd server
npm install
cp .dev.vars.example .dev.vars
```

`server/.dev.vars` を設定します。

```env
GITHUB_TOKEN=github_pat_xxx
GITHUB_WEBHOOK_SECRET=change_me
ALLOWED_ORIGIN=http://localhost:5173
```

`server/wrangler.toml` の `database_id` を実際の D1 database ID に変更します。

```bash
npm run db:migrate:local
```

### web

```bash
cd web
npm install
```

必要なら `web/.env` を作成します。

```env
VITE_API_BASE_URL=http://localhost:8787
```

## 起動

ターミナル1:

```bash
cd server
npm run dev -- --port 8787
```

ターミナル2:

```bash
cd web
npm run dev -- --port 5173
```

開くURL:

```txt
http://localhost:5173
```
