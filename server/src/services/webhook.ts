import { createWebhookEvent, getWebhookEventByDeliveryId, markWebhookEventProcessed } from "../repositories/webhookEventRepository";
import type { WorkflowJobWebhookPayload, WorkflowRunWebhookPayload } from "../types/github";
import { saveWebhookWorkflowJob, saveWebhookWorkflowRun } from "./sync";

const workflowRunActions = new Set(["requested", "in_progress", "completed", "rerun_requested"]);
const workflowJobActions = new Set(["queued", "in_progress", "completed"]);

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("unique") || message.includes("constraint");
}

export async function processGitHubWebhook(db: D1Database, deliveryId: string, eventType: string, body: string) {
  const payload = JSON.parse(body) as { action?: string };
  const existing = await getWebhookEventByDeliveryId(db, deliveryId);
  if (existing) return { duplicate: true, processed: false };

  try {
    await createWebhookEvent(db, {
      github_delivery_id: deliveryId,
      event_type: eventType,
      action: payload.action ?? null,
      payload_json: body,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { duplicate: true, processed: false };
    throw error;
  }

  try {
    if (eventType === "workflow_run" && payload.action && workflowRunActions.has(payload.action)) {
      await saveWebhookWorkflowRun(db, payload as WorkflowRunWebhookPayload);
    }

    if (eventType === "workflow_job" && payload.action && workflowJobActions.has(payload.action)) {
      await saveWebhookWorkflowJob(db, payload as WorkflowJobWebhookPayload);
    }

    await markWebhookEventProcessed(db, deliveryId);
    return { duplicate: false, processed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await markWebhookEventProcessed(db, deliveryId, message);
    throw error;
  }
}
