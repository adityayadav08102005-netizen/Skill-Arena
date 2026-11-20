import { ownFileHandlers } from "@/lib/files/uploadRoute";

/** POST (multipart, field "file") uploads or replaces your resume; DELETE removes it. Students only. */
export const { POST, DELETE } = ownFileHandlers("resume", "resumeFileId", { roles: ["student"] });
