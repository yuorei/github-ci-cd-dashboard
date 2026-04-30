import type { Context } from "hono";
import type { ApiError } from "../types/api";

export function parsePagination(query: Record<string, string | undefined>) {
  const rawLimit = Number(query.limit ?? 50);
  const rawOffset = Number(query.offset ?? 0);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 50 : Math.trunc(rawLimit), 1), 100);
  const offset = Math.max(Number.isNaN(rawOffset) ? 0 : Math.trunc(rawOffset), 0);
  return { limit, offset };
}

export function badRequest(c: Context, error: string, details?: unknown) {
  return c.json<ApiError>({ error, details }, 400);
}

export function notFound(c: Context, error = "Not found") {
  return c.json<ApiError>({ error }, 404);
}
