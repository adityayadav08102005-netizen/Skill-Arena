import "server-only";
import { ObjectId } from "mongodb";
import { Profile } from "@/lib/db/models";
import { dayKey, shiftDay } from "@/lib/utils/time";
import { XP_RULES } from "@/lib/utils/xp";
import { notify } from "./activity";
import { awardXp } from "./gamification";

/**
 * Records a coding day for the streak. Counting a day twice is a no-op;
 * yesterday → today extends the streak; any gap restarts it at 1.
 * The update is conditional on the previous value, so two submissions racing
 * in the same request window can't double-increment.
 *
 * Returns { current, longest, extended, milestoneXp }.
 */
export async function recordCodingDay(userId, now = new Date()) {
  const uid = new ObjectId(String(userId));
  const today = dayKey(now);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const profile = await Profile.findOne({ userId: uid }, { streak: 1 }).lean();
    const prev = profile?.streak ?? { current: 0, longest: 0, lastActivityDate: null };
    const lastKey = prev.lastActivityDate ? dayKey(new Date(prev.lastActivityDate)) : null;
    if (lastKey === today) return { current: prev.current, longest: prev.longest, extended: false, milestoneXp: 0 };

    const current = lastKey === shiftDay(today, 1) ? prev.current + 1 : 1;
    const longest = Math.max(prev.longest ?? 0, current);
    const updated = await Profile.updateOne(
      { userId: uid, "streak.lastActivityDate": prev.lastActivityDate ?? null },
      { $set: { "streak.current": current, "streak.longest": longest, "streak.lastActivityDate": now } },
    );
    if (updated.modifiedCount === 0) continue; // someone else updated first; re-read

    let milestoneXp = 0;
    const bonus = XP_RULES.streakMilestones[current];
    if (bonus) {
      const result = await awardXp(uid, { amount: bonus, reason: "streak_milestone", refId: `streak-${current}` });
      if (result.awarded) {
        milestoneXp = bonus;
        await notify(uid, {
          type: "streak_milestone",
          title: `${current}-day coding streak`,
          body: `You earned ${bonus} bonus XP. Keep it going tomorrow.`,
          link: "/algoarena",
        });
      }
    }
    return { current, longest, extended: true, milestoneXp };
  }
  return null;
}
