import "server-only";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db/mongoose";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { UploadError, deleteUpload, storeUpload } from "@/services/files";
import { setProfileFile } from "@/services/profiles";

/**
 * Shared POST/DELETE handlers for the signed-in user's own resume or avatar.
 * kind: "resume" | "avatar"; field: the profile field holding the GridFS id.
 */
export function ownFileHandlers(kind, field, { roles } = {}) {
  async function POST(request) {
    const { user, response } = await requireApiUser(request, { roles });
    if (response) return response;
    const limited = await limitOrNull(`upload:${kind}:${user.id}`, { limit: 10, windowMs: 10 * 60_000 });
    if (limited) return limited;

    let form;
    try {
      form = await request.formData();
    } catch {
      return apiError(400, "Send the file as multipart form data.");
    }

    try {
      await connectToDatabase();
      const fileId = await storeUpload(kind, form.get("file"), user.id);
      const result = await setProfileFile(user, field, fileId);
      await deleteUpload(kind, result.previous); // replace, don't accumulate
      return NextResponse.json({ fileId: String(fileId), completion: result.completion, xp: result.xp });
    } catch (error) {
      if (error instanceof UploadError) return apiError(error.status, error.message);
      console.error(`${kind} upload failed`, error);
      return apiError(500, "Upload failed. Try again.");
    }
  }

  async function DELETE(request) {
    const { user, response } = await requireApiUser(request, { roles });
    if (response) return response;
    await connectToDatabase();
    const result = await setProfileFile(user, field, null);
    await deleteUpload(kind, result.previous);
    return NextResponse.json({ completion: result.completion });
  }

  return { POST, DELETE };
}
