import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { connectToDatabase } from "@/lib/db/mongoose";
import { limitOrNull } from "@/lib/utils/rateLimit";
import { UploadError, deleteUpload, storeUpload } from "@/services/files";
import { RecruiterError, setCompanyLogo } from "@/services/recruiter";

/** POST (multipart "file") uploads or replaces your company logo; DELETE removes it. */
export async function POST(request) {
  const { user, response } = await requireApiUser(request, { roles: ["recruiter"] });
  if (response) return response;
  const limited = await limitOrNull(`logo:${user.id}`, { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let form;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "Send the file as multipart form data.");
  }
  try {
    await connectToDatabase();
    const fileId = await storeUpload("logo", form.get("file"), user.id);
    const { previous, companyId } = await setCompanyLogo(user, fileId);
    await deleteUpload("logo", previous);
    return NextResponse.json({ fileId: String(fileId), companyId });
  } catch (error) {
    if (error instanceof UploadError || error instanceof RecruiterError) return apiError(error.status, error.message);
    console.error("logo upload failed", error);
    return apiError(500, "Upload failed. Try again.");
  }
}

export async function DELETE(request) {
  const { user, response } = await requireApiUser(request, { roles: ["recruiter"] });
  if (response) return response;
  try {
    const { previous } = await setCompanyLogo(user, null);
    await deleteUpload("logo", previous);
    return NextResponse.json({ removed: true });
  } catch (error) {
    if (error instanceof RecruiterError) return apiError(error.status, error.message);
    throw error;
  }
}
