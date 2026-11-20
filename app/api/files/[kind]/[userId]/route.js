import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Company, Profile } from "@/lib/db/models";
import { isDatabaseConfigured } from "@/lib/utils/dataMode";
import { openUpload } from "@/services/files";

/**
 * GET /api/files/avatar/:userId — public profile photo.
 * GET /api/files/logo/:companyId — public company logo.
 * GET /api/files/resume/:userId — profile resume. Allowed for the owner,
 *   admins, and signed-in recruiters when the student made their resume
 *   visible. (Resumes attached to applications use /api/applications/:id/resume.)
 */
export async function GET(request, { params }) {
  const { kind, userId } = await params;
  if (!["avatar", "resume", "logo"].includes(kind) || !ObjectId.isValid(userId)) return apiError(404, "File not found.");
  if (!isDatabaseConfigured()) return apiError(404, "File not found.");

  await connectToDatabase();
  if (kind === "logo") {
    const company = await Company.findById(userId, { logoFileId: 1 }).lean();
    const logo = company?.logoFileId ? await openUpload("logo", company.logoFileId) : null;
    if (!logo) return apiError(404, "File not found.");
    return new Response(Readable.toWeb(logo.stream), {
      headers: { "Content-Type": logo.contentType, "Content-Length": String(logo.length), "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=300" },
    });
  }
  const profile = await Profile.findOne(
    { userId: new ObjectId(userId) },
    { avatarFileId: 1, resumeFileId: 1, isPublic: 1, visibility: 1, isActive: 1 },
  ).lean();
  const fileId = kind === "avatar" ? profile?.avatarFileId : profile?.resumeFileId;
  if (!profile || !fileId) return apiError(404, "File not found.");

  if (kind === "resume") {
    const { user, response } = await requireApiUser(request);
    if (response) return response;
    const isOwner = user.id === userId;
    const allowed =
      isOwner || user.role === "admin" || (user.role === "recruiter" && profile.isPublic && profile.visibility?.resume === true);
    if (!allowed) return apiError(403, "This resume is private.");
  }

  const file = await openUpload(kind, fileId);
  if (!file) return apiError(404, "File not found.");

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Content-Length": String(file.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": kind === "avatar" ? "public, max-age=300" : "private, no-store",
  });
  if (kind === "resume") {
    headers.set("Content-Disposition", `attachment; filename="${file.filename.replace(/"/g, "")}"`);
  }
  return new Response(Readable.toWeb(file.stream), { headers });
}
