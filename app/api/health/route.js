import mongoose from "mongoose";
import { NextResponse, connection } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { executionMode } from "@/lib/execution/engine";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";

/**
 * Uptime check for the host or a monitor: 200 when the app (and database, if
 * configured) answers, 503 otherwise. Reveals only on/off flags, never URLs or keys.
 */
export async function GET() {
  await connection();
  const started = Date.now();
  const body = { status: "ok", mode: isDatabaseConfigured() ? "database" : "demo", codeRunner: executionMode(), time: new Date().toISOString() };
  if (isDatabaseConfigured()) {
    try {
      await connectToDatabase();
      await mongoose.connection.db.admin().ping();
      body.database = { ok: true, latencyMs: Date.now() - started };
    } catch {
      return NextResponse.json({ ...body, status: "degraded", database: { ok: false } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
