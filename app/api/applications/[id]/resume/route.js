import { Readable } from "node:stream";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { resumeAccess } from "@/services/applications";
import { openUpload } from "@/services/files";

/**
 * GET /api/applications/:id/resume — the resume snapshot attached to an
 * application. Allowed for the student, an admin, or the listing's recruiter.
 */
export async function GET(request, { params }) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  const { id } = await params;
  const access = await resumeAccess(user, id);
  if (access === null) return apiError(404, "Resume not found.");
  if (access === false) return apiError(403, "You can't view this resume.");
  const file = await openUpload("resume", access.resumeFileId);
  if (!file) return apiError(404, "Resume not found.");
  return new Response(Readable.toWeb(file.stream), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
