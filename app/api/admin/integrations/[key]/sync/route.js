import { adminRoute } from "@/lib/admin/route";
import { logActivity } from "@/services/activity";
import { AdminError } from "@/services/admin";
import { SOURCES, syncSource } from "@/services/jobSync";

export const maxDuration = 60;

/** Import listings from one job board now (still limited to the board's minimum interval). */
export const POST = adminRoute(async ({ user, params }) => {
  if (!SOURCES[params.key]) throw new AdminError("Unknown job board.", 404);
  const result = await syncSource(params.key, { trigger: "admin" });
  if (result.skipped === "interval") throw new AdminError(`${SOURCES[params.key].label} was synced recently. Next sync allowed ${new Date(result.nextAt).toISOString()}.`, 429);
  if (result.skipped === "running") throw new AdminError("A sync is already running.", 409);
  if (result.skipped === "not_configured") throw new AdminError(`${SOURCES[params.key].label} needs an API key before it can sync.`, 409);
  await logActivity(user.id, "admin.integration_sync", { entityType: "integration", entityId: params.key, metadata: { title: SOURCES[params.key].label, ...(result.stats ?? {}), error: result.error } });
  if (!result.ok) throw new AdminError(result.error, 502);
  return result;
}, { limit: 10, bucket: "sync" });
