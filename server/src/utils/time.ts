export function nowIso(): string {
  return new Date().toISOString();
}

export function secondsBetween(startedAt?: string | null, completedAt?: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (Number.isNaN(started) || Number.isNaN(completed) || completed < started) return null;
  return Math.round((completed - started) / 1000);
}
