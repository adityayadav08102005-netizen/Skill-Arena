import "server-only";
import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { CONTENT_TYPES, UPLOAD_RULES, detectFileType, safeFilename } from "@/lib/utils/files";

/** GridFS storage for resumes and avatars, kept in the same MongoDB database. */
function bucket(name) {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: name });
}

export class UploadError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

/**
 * Validates and stores an uploaded File (from request.formData()).
 * kind: "resume" | "avatar". Returns the new GridFS file id.
 */
export async function storeUpload(kind, file, ownerId) {
  const rules = UPLOAD_RULES[kind];
  if (!rules) throw new UploadError("Unknown upload type.");
  if (!file || typeof file.arrayBuffer !== "function") throw new UploadError("Choose a file to upload.");
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > rules.maxBytes) throw new UploadError(`That file is too large. Upload a ${rules.label}.`, 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(buffer, file.name);
  if (!type || !rules.types.includes(type)) throw new UploadError(`Unsupported file. Upload a ${rules.label}.`, 415);

  const filename = safeFilename(file.name, `${kind}.${type}`);
  const upload = bucket(rules.bucket).openUploadStream(filename, {
    metadata: { ownerId: new ObjectId(String(ownerId)), kind, type, contentType: CONTENT_TYPES[type] },
  });
  await new Promise((resolve, reject) => {
    Readable.from(buffer).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

/**
 * Copies a stored file into a new GridFS file (e.g. snapshotting a profile
 * resume onto an application, so replacing the profile resume later doesn't
 * change what the recruiter received). Returns the new file id, or null.
 */
export async function copyUpload(kind, fileId, ownerId, metadata = {}) {
  const rules = UPLOAD_RULES[kind];
  const b = bucket(rules.bucket);
  const id = new ObjectId(String(fileId));
  const [info] = await b.find({ _id: id }).limit(1).toArray();
  if (!info) return null;
  const upload = b.openUploadStream(info.filename, {
    metadata: { ...info.metadata, ...metadata, ownerId: new ObjectId(String(ownerId)), copiedFrom: id },
  });
  await new Promise((resolve, reject) => {
    b.openDownloadStream(id).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return upload.id;
}

export async function deleteUpload(kind, fileId) {
  if (!fileId) return;
  try {
    await bucket(UPLOAD_RULES[kind].bucket).delete(new ObjectId(String(fileId)));
  } catch (error) {
    if (!/FileNotFound|File not found/i.test(error.message)) throw error;
  }
}

/** Returns { stream, contentType, length, filename } or null if the file is gone. */
export async function openUpload(kind, fileId) {
  const b = bucket(UPLOAD_RULES[kind].bucket);
  const id = new ObjectId(String(fileId));
  const [info] = await b.find({ _id: id }).limit(1).toArray();
  if (!info) return null;
  return {
    stream: b.openDownloadStream(id),
    contentType: info.metadata?.contentType ?? "application/octet-stream",
    length: info.length,
    filename: info.filename,
  };
}
