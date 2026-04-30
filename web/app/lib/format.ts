const labels: Record<string, string> = {
  queued: "待機中",
  in_progress: "実行中",
  completed: "完了",
  success: "成功",
  failure: "失敗",
  cancelled: "キャンセル",
  skipped: "スキップ",
  timed_out: "タイムアウト",
  action_required: "要対応",
};

export function statusLabel(value?: string | null) {
  if (!value) return "-";
  return labels[value] ?? value;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null) return "-";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return `${minutes}m ${rest}s`;
}

export function shortSha(value?: string | null) {
  return value ? value.slice(0, 7) : "-";
}

export function badgeClass(value?: string | null) {
  switch (value) {
    case "success":
      return "badge badge-success";
    case "failure":
    case "timed_out":
    case "action_required":
      return "badge badge-danger";
    case "queued":
    case "in_progress":
      return "badge badge-running";
    case "cancelled":
    case "skipped":
      return "badge badge-muted";
    default:
      return "badge";
  }
}
