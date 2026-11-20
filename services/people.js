import "server-only";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { Profile } from "@/lib/db/models";

/**
 * Public identity for ranked lists (contests, leaderboards). Students with a
 * private profile still count in rankings but appear as "Private student" with
 * no link or photo — unless the viewer is that student.
 * Returns Map(userId string → { name, isPublic, hasAvatar, image, level, profileHref }).
 */
export async function publicIdentities(userIds, viewerId = null) {
  const ids = [...new Set(userIds.map(String))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (!ids.length) return new Map();
  const [profiles, users] = await Promise.all([
    Profile.find({ userId: { $in: ids } }, { userId: 1, fullName: 1, isPublic: 1, avatarFileId: 1, level: 1, isActive: 1 }).lean(),
    mongoose.connection.collection("user").find({ _id: { $in: ids } }, { projection: { image: 1 } }).toArray(),
  ]);
  const imageOf = new Map(users.map((u) => [String(u._id), u.image ?? null]));
  const map = new Map();
  for (const p of profiles) {
    const id = String(p.userId);
    const self = viewerId && id === String(viewerId);
    const visible = (p.isPublic && p.isActive) || self;
    map.set(id, {
      userId: id,
      name: visible ? p.fullName : "Private student",
      isPublic: Boolean(visible),
      hasAvatar: visible && Boolean(p.avatarFileId),
      image: visible ? imageOf.get(id) : null,
      level: p.level ?? 1,
      profileHref: visible ? `/u/${id}` : null,
      isYou: Boolean(self),
    });
  }
  return map;
}
