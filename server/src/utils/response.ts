import type { Context } from "hono";
import type { ApiError } from "../types/api";

export function parsePagination(query: Record<string, string | undefined>) {
  const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);
  return { limit, offset };
}

export function badRequest(c: Context, error: string, details?: unknown) {
  return c.json<ApiError>({ error, details }, 400);
}

export function notFound(c: Context, error = "Not found") {
  return c.json<ApiError>({ error }, 404);
}
