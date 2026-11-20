import { ObjectId, Schema, USER_REF, baseOptions, model } from "./_shared.js";

/*
 * profiles — one per Better Auth user. Spec tables student_skills, education,
 * projects and coding_streaks are embedded here because they are always read
 * with the profile and owned by the same user.
 *
 * XP, level, skillLevel and streak are server-managed: they are only changed by
 * services/gamification (Phase 5), never from a client payload.
 */

const studentSkillSchema = new Schema(
  {
    skillId: { type: ObjectId, ref: "Skill", required: true },
    name: { type: String, required: true, trim: true },
    proficiency: { type: Number, min: 1, max: 5, default: 3 },
    verified: { type: Boolean, default: false }, // set when backed by an assessment score
    source: { type: String, enum: ["self", "assessment"], default: "self" },
  },
  { _id: false },
);

const educationSchema = new Schema({
  institution: { type: String, required: true, trim: true, maxlength: 160 },
  degree: { type: String, trim: true, maxlength: 80 },
  fieldOfStudy: { type: String, trim: true, maxlength: 120 },
  startYear: { type: Number, min: 1980, max: 2100 },
  endYear: { type: Number, min: 1980, max: 2100 },
  grade: { type: String, trim: true, maxlength: 40 },
});

const experienceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  organization: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ["internship", "job", "freelance", "volunteer", "other"], default: "internship" },
  startDate: Date,
  endDate: Date,
  description: { type: String, maxlength: 2000 },
});

const projectSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 2000 },
  techStack: [{ type: String, trim: true, maxlength: 40 }],
  repoUrl: { type: String, trim: true, maxlength: 300 },
  liveUrl: { type: String, trim: true, maxlength: 300 },
});

const profileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: USER_REF, required: true, unique: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    avatarFileId: { type: ObjectId, default: null }, // GridFS file
    headline: { type: String, trim: true, maxlength: 160 },
    bio: { type: String, maxlength: 2000 },
    location: { type: String, trim: true, maxlength: 120 },

    // Student fields
    college: { type: String, trim: true, maxlength: 160 },
    degree: { type: String, trim: true, maxlength: 80 },
    department: { type: String, trim: true, maxlength: 120 },
    graduationYear: { type: Number, min: 1980, max: 2100 },
    preferredRoles: [{ type: String, trim: true, maxlength: 80 }],
    skills: { type: [studentSkillSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    githubUsername: { type: String, trim: true, maxlength: 39 },
    linkedinUrl: { type: String, trim: true, maxlength: 300 },
    codeforcesHandle: { type: String, trim: true, maxlength: 24 },
    resumeFileId: { type: ObjectId, default: null }, // GridFS file, private

    // Recruiter fields
    companyId: { type: ObjectId, ref: "Company", default: null },
    jobTitle: { type: String, trim: true, maxlength: 120 },

    // Server-managed gamification state
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    skillLevel: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], default: "beginner" },
    streak: {
      current: { type: Number, default: 0, min: 0 },
      longest: { type: Number, default: 0, min: 0 },
      lastActivityDate: { type: Date, default: null },
    },

    // Student-chosen targets for the progress page
    goals: {
      weeklyProblems: { type: Number, min: 1, max: 50, default: 5 },
      weeklyActiveDays: { type: Number, min: 1, max: 7, default: 4 },
      monthlyXp: { type: Number, min: 50, max: 20000, default: 500 },
    },

    // Privacy: which sections other users may see on the public profile
    isPublic: { type: Boolean, default: true },
    visibility: {
      email: { type: Boolean, default: false },
      resume: { type: Boolean, default: false },
      education: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      codingStats: { type: Boolean, default: true },
      assessmentScores: { type: Boolean, default: true },
      github: { type: Boolean, default: true },
      linkedin: { type: Boolean, default: true },
    },
    onboardingComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, // admins can suspend
    isSample: { type: Boolean, default: false },
  },
  baseOptions,
);

profileSchema.index({ xp: -1 });
profileSchema.index({ "skills.name": 1 });
profileSchema.index({ graduationYear: 1 });
profileSchema.index({ companyId: 1 });
profileSchema.index({ fullName: "text", headline: "text", college: "text" });

export const Profile = model("Profile", profileSchema, "profiles");
