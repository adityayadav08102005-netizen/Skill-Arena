import { demoId } from "./ids.js";

/** Skill catalogue. category: language | technical | tool | soft */
const RAW = [
  ["Python", "language"],
  ["Java", "language"],
  ["C++", "language"],
  ["C", "language"],
  ["JavaScript", "language"],
  ["TypeScript", "language"],
  ["SQL", "language"],
  ["Go", "language"],
  ["Data Structures", "technical"],
  ["Algorithms", "technical"],
  ["DBMS", "technical"],
  ["Operating Systems", "technical"],
  ["Computer Networks", "technical"],
  ["OOP", "technical"],
  ["System Design", "technical"],
  ["Machine Learning", "technical"],
  ["Data Analysis", "technical"],
  ["React", "tool"],
  ["Next.js", "tool"],
  ["Node.js", "tool"],
  ["Django", "tool"],
  ["Spring Boot", "tool"],
  ["PostgreSQL", "tool"],
  ["MongoDB", "tool"],
  ["Git", "tool"],
  ["Docker", "tool"],
  ["AWS", "tool"],
  ["Linux", "tool"],
  ["Tailwind CSS", "tool"],
  ["Pandas", "tool"],
  ["Communication", "soft"],
  ["Teamwork", "soft"],
  ["Problem Solving", "soft"],
  ["Leadership", "soft"],
];

export const skills = RAW.map(([name, category], i) => ({
  id: demoId("skill", i + 1),
  name,
  category,
}));

export const skillByName = Object.fromEntries(skills.map((s) => [s.name, s]));
