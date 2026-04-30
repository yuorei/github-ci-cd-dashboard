import { nowIso } from "../utils/time";

export async function createWebhookEvent(
  db: D1Database,
  input: { github_delivery_id: string; event_type: string; action?: string | null; payload_json: string }
) {
  await db
    .prepare(
      `INSERT INTO webhook_events (github_delivery_id, event_type, action, payload_json, received_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(input.github_delivery_id, input.event_type, input.action ?? null, input.payload_json, nowIso())
    .run();
}

export async function getWebhookEventByDeliveryId(db: D1Database, deliveryId: string) {
  return db.prepare("SELECT * FROM webhook_events WHERE github_delivery_id = ?").bind(deliveryId).first();
}

export async function markWebhookEventProcessed(db: D1Database, deliveryId: string, errorMessage?: string) {
  await db
    .prepare(
      `UPDATE webhook_events
       SET processed = ?, error_message = ?, processed_at = ?
       WHERE github_delivery_id = ?`
    )
    .bind(errorMessage ? 0 : 1, errorMessage ?? null, nowIso(), deliveryId)
    .run();
}
