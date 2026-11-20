import mongoose from "mongoose";

export const { Schema } = mongoose;
export const ObjectId = Schema.Types.ObjectId;

/** Better Auth owns the `user` collection; other models reference it by id. */
export const USER_REF = "user";

/**
 * Compile a model. In development the previous compilation is dropped first,
 * so schema edits take effect on hot reload instead of silently keeping the
 * old schema; in production the cached model is reused.
 * `collection` pins the MongoDB collection name so it matches the spec.
 */
export function model(name, schema, collection) {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return mongoose.models[name] ?? mongoose.model(name, schema, collection);
}

/** Default schema options: timestamps, `id` string on JSON, no __v. */
export const baseOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      return ret;
    },
  },
};

export const DIFFICULTIES = ["easy", "medium", "hard"];
export const LANGUAGES = ["python", "java", "cpp", "javascript"];
export const ROLES = ["student", "recruiter", "admin"];
