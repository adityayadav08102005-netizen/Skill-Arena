/**
 * Upload rules and content sniffing. The browser-reported MIME type is never
 * trusted: the first bytes of the file decide what it really is.
 */
export const UPLOAD_RULES = {
  resume: {
    bucket: "resumes",
    maxBytes: 4 * 1024 * 1024, // under Vercel's 4.5 MB request body limit
    types: ["pdf", "doc", "docx"],
    label: "PDF, DOC or DOCX up to 4 MB",
  },
  avatar: {
    bucket: "avatars",
    maxBytes: 2 * 1024 * 1024,
    types: ["png", "jpeg", "webp"],
    label: "PNG, JPG or WebP up to 2 MB",
  },
  logo: {
    bucket: "logos",
    maxBytes: 2 * 1024 * 1024,
    types: ["png", "jpeg", "webp"],
    label: "PNG, JPG or WebP up to 2 MB",
  },
};

export const CONTENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

/** Returns pdf | doc | docx | png | jpeg | webp | null based on magic bytes (and .docx name for zips). */
export function detectFileType(buf, filename = "") {
  if (!buf || buf.length < 12) return null;
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "doc"; // OLE2
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) && /\.docx$/i.test(filename)) return "docx"; // zip container
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

/** Strip path parts and odd characters from a user-supplied filename. */
export function safeFilename(name, fallback = "file") {
  const base = String(name || "").split(/[\\/]/).pop().replace(/[^\w.\- ]+/g, "").trim().slice(0, 100);
  return base || fallback;
}
