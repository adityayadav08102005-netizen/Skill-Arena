import { ownFileHandlers } from "@/lib/files/uploadRoute";

/** POST (multipart, field "file") uploads or replaces your profile photo; DELETE removes it. */
export const { POST, DELETE } = ownFileHandlers("avatar", "avatarFileId");
