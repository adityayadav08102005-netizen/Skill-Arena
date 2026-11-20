import { companies } from "./companies.js";
import { demoId } from "./ids.js";

/**
 * Demo accounts. Emails use the reserved `.test` domain so they can never
 * reach a real inbox. Passwords are not stored here: the seed script reads
 * DEMO_USER_PASSWORD from .env.local. `activity` (0–1) drives how much sample
 * coding history each student gets.
 */
const STUDENTS = [
  {
    key: "aarav",
    name: "Aarav Mehta",
    college: "National Institute of Technology, Tiruchirappalli",
    degree: "B.Tech",
    department: "Computer Science and Engineering",
    graduationYear: 2027,
    headline: "Frontend-leaning CSE student who likes graph problems",
    skills: [["JavaScript", 4], ["React", 4], ["Python", 3], ["Data Structures", 3], ["Git", 4], ["SQL", 2]],
    preferredRoles: ["Frontend developer", "Full-stack developer"],
    activity: 0.8,
  },
  {
    key: "riya",
    name: "Riya Patel",
    college: "Vellore Institute of Technology",
    degree: "B.Tech",
    department: "Information Technology",
    graduationYear: 2026,
    headline: "Competitive programmer, Java and C++",
    skills: [["Java", 5], ["C++", 4], ["Data Structures", 5], ["Algorithms", 5], ["SQL", 3]],
    preferredRoles: ["Software engineer", "SDE intern"],
    activity: 0.95,
  },
  {
    key: "kabir",
    name: "Kabir Singh",
    college: "Delhi Technological University",
    degree: "B.Tech",
    department: "Software Engineering",
    graduationYear: 2026,
    headline: "Backend and systems enthusiast",
    skills: [["Go", 3], ["Python", 4], ["Docker", 3], ["Linux", 4], ["Operating Systems", 4], ["Computer Networks", 3]],
    preferredRoles: ["Backend developer", "Site reliability engineer"],
    activity: 0.9,
  },
  {
    key: "sana",
    name: "Sana Khan",
    college: "Jamia Millia Islamia",
    degree: "BCA",
    department: "Computer Applications",
    graduationYear: 2027,
    headline: "Data analysis and visualisation",
    skills: [["Python", 4], ["Pandas", 4], ["SQL", 4], ["Data Analysis", 4], ["Machine Learning", 2]],
    preferredRoles: ["Data analyst", "ML intern"],
    activity: 0.7,
  },
  {
    key: "dev",
    name: "Dev Nair",
    college: "College of Engineering, Trivandrum",
    degree: "B.Tech",
    department: "Electronics and Communication",
    graduationYear: 2028,
    headline: "ECE student learning DSA in C++",
    skills: [["C", 3], ["C++", 3], ["Data Structures", 2], ["Linux", 2]],
    preferredRoles: ["Embedded developer", "Software engineer"],
    activity: 0.5,
  },
  {
    key: "meera",
    name: "Meera Iyer",
    college: "PSG College of Technology",
    degree: "M.Sc",
    department: "Software Systems",
    graduationYear: 2026,
    headline: "Full-stack developer building for healthcare",
    skills: [["JavaScript", 4], ["Node.js", 4], ["MongoDB", 3], ["Python", 3], ["Django", 3], ["Communication", 4]],
    preferredRoles: ["Full-stack developer", "Backend developer"],
    activity: 0.6,
  },
];

const RECRUITERS = [
  { key: "priya", name: "Priya Nair", title: "Talent acquisition lead", companySlug: "nimbus-labs" },
  { key: "arjun", name: "Arjun Rao", title: "Engineering manager", companySlug: "quillpay" },
];

const companyBySlug = Object.fromEntries(companies.map((c) => [c.slug, c]));

let n = 0;
const nextId = () => demoId("user", ++n);

export const demoStudents = STUDENTS.map((s) => ({
  id: nextId(),
  role: "student",
  email: `${s.key}@students.skillarena.test`,
  ...s,
}));

export const demoRecruiters = RECRUITERS.map((r) => ({
  id: nextId(),
  role: "recruiter",
  email: `${r.key}@recruiters.skillarena.test`,
  companyId: companyBySlug[r.companySlug].id,
  ...r,
}));

export const demoAdmin = {
  id: nextId(),
  role: "admin",
  key: "admin",
  name: "SkillArena Admin",
  email: "admin@skillarena.test",
};

export const demoUsers = [...demoStudents, ...demoRecruiters, demoAdmin];
