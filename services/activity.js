import "server-only";
import { ObjectId } from "mongodb";
import { ActivityLog, Notification } from "@/lib/db/models";

const toId = (id) => (id ? new ObjectId(String(id)) : null);

/** Append to the activity history. Never throws: logging must not break the action it records. */
export async function logActivity(userId, action, { entityType, entityId, metadata } = {}) {
  try {
    await ActivityLog.create({ userId: toId(userId), action, entityType, entityId: entityId ? String(entityId) : undefined, metadata });
  } catch (error) {
    console.error("activity log failed", action, error.message);
  }
}

/** Create an in-app notification. Never throws for the same reason. */
export async function notify(userId, { type, title, body, link }) {
  try {
    await Notification.create({ userId: toId(userId), type, title, body, link });
  } catch (error) {
    console.error("notification failed", type, error.message);
  }
}
