import { ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

/* activity_logs — append-only history of important actions. */
const activityLogSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, default: null },
    action: { type: String, required: true, maxlength: 80 }, // e.g. "submission.accepted"
    entityType: { type: String, maxlength: 40 },
    entityId: { type: String, maxlength: 40 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { ...baseOptions, timestamps: { createdAt: true, updatedAt: false } },
);
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
export const ActivityLog = model("ActivityLog", activityLogSchema, "activity_logs");

/* notifications — in-app inbox. Users may only flip `isRead` on their own. */
const notificationSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true },
    type: {
      type: String,
      enum: [
        "application_status", "new_application", "new_opportunity", "contest_reminder",
        "assessment_result", "achievement", "streak_milestone", "level_up", "system",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, maxlength: 1000 },
    link: { type: String, maxlength: 300 },
    isRead: { type: Boolean, default: false },
  },
  baseOptions,
);
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
export const Notification = model("Notification", notificationSchema, "notifications");

/* content_reports — added beyond the spec's table list to back report management. */
const reportSchema = new Schema(
  {
    reporterId: { type: ObjectId, ref: USER_REF, required: true },
    entityType: { type: String, enum: ["opportunity", "profile", "company", "problem", "question"], required: true },
    entityId: { type: ObjectId, required: true },
    reason: { type: String, enum: ["spam", "misleading", "inappropriate", "incorrect", "other"], required: true },
    details: { type: String, maxlength: 2000 },
    status: { type: String, enum: ["open", "dismissed", "actioned"], default: "open" },
    resolvedBy: { type: ObjectId, ref: USER_REF, default: null },
    resolvedAt: { type: Date, default: null },
  },
  baseOptions,
);
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, entityType: 1, entityId: 1 }, { unique: true });
export const ContentReport = model("ContentReport", reportSchema, "content_reports");
