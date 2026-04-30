export type Env = {
  DB: D1Database;
  GITHUB_TOKEN: string;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_API_BASE_URL?: string;
  ALLOWED_ORIGIN?: string;
};
