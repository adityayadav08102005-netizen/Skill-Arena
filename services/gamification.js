import "server-only";
import { ObjectId } from "mongodb";
import { Profile, XpEvent } from "@/lib/db/models";
import { levelForXp, skillLevelFor } from "@/lib/utils/xp";
import { logActivity, notify } from "./activity";

/**
 * The single place XP is granted. Writes an xp_events row first; its unique
 * (userId, reason, refId) index makes a repeated award a no-op, so retries and
 * double-clicks can never grant the same reward twice. Then bumps the cached
 * total and level on the profile.
 *
 * Returns { awarded, xp, level, leveledUp }.
 */
export async function awardXp(userId, { amount, reason, refId }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("XP amount must be a positive integer");
  const uid = new ObjectId(String(userId));

  try {
    await XpEvent.create({ userId: uid, amount, reason, refId: String(refId) });
  } catch (error) {
    if (error?.code === 11000) {
      const profile = await Profile.findOne({ userId: uid }, { xp: 1, level: 1 }).lean();
      return { awarded: false, xp: profile?.xp ?? 0, level: profile?.level ?? 1, leveledUp: false };
    }
    throw error;
  }

  const updated = await Profile.findOneAndUpdate({ userId: uid }, { $inc: { xp: amount } }, { returnDocument: "after", projection: { xp: 1, level: 1 } }).lean();
  const level = levelForXp(updated.xp);
  const leveledUp = level > updated.level;
  if (level !== updated.level) {
    await Profile.updateOne({ userId: uid }, { $set: { level, skillLevel: skillLevelFor(level) } });
  }

  await logActivity(uid, "xp.awarded", { entityType: reason, entityId: refId, metadata: { amount } });
  if (leveledUp) {
    await notify(uid, { type: "level_up", title: `You reached level ${level}`, body: `Keep going: ${updated.xp} XP so far.`, link: "/profile" });
  }
  return { awarded: true, xp: updated.xp, level, leveledUp };
}
