import "server-only";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notification } from "@/lib/db/models";

const uidOf = (id) => new ObjectId(String(id));

export async function unreadCount(userId) {
  await connectToDatabase();
  return Notification.countDocuments({ userId: uidOf(userId), isRead: false });
}

export async function listNotifications(userId, limit = 20) {
  await connectToDatabase();
  const uid = uidOf(userId);
  const [items, unread] = await Promise.all([
    Notification.find({ userId: uid }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId: uid, isRead: false }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body ?? "",
      // Only same-site links are rendered as links.
      link: typeof n.link === "string" && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  };
}

/** Marks the given notifications (or all) as read — only ever the caller's own. */
export async function markRead(userId, ids) {
  await connectToDatabase();
  const filter = { userId: uidOf(userId), isRead: false };
  if (ids?.length) filter._id = { $in: ids.filter((id) => ObjectId.isValid(id)).map(uidOf) };
  const result = await Notification.updateMany(filter, { $set: { isRead: true } });
  return result.modifiedCount;
}
