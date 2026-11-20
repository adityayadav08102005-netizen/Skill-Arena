"use client";

import { useState } from "react";
import { useSectionSave } from "@/hooks/useSectionSave";
import { SaveRow, SectionCard, TextArea, TextField } from "./fields";

const STUDENT_KEYS = ["college", "degree", "department", "graduationYear", "githubUsername", "linkedinUrl", "codeforcesHandle"];

export default function BasicsSection({ profile, role, onSaved }) {
  const student = role === "student";
  const [v, setV] = useState({
    fullName: profile.fullName ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    college: profile.college ?? "",
    degree: profile.degree ?? "",
    department: profile.department ?? "",
    graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
    preferredRoles: (profile.preferredRoles ?? []).join(", "),
    jobTitle: profile.jobTitle ?? "",
    githubUsername: profile.githubUsername ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    codeforcesHandle: profile.codeforcesHandle ?? "",
  });
  const { save, status, error, clearError } = useSectionSave("basics", onSaved);

  const bind = (key) => ({
    id: `basics-${key}`,
    value: v[key],
    onChange: (e) => {
      setV((s) => ({ ...s, [key]: e.target.value }));
      clearError();
    },
  });

  function submit(e) {
    e.preventDefault();
    const body = {
      fullName: v.fullName,
      headline: v.headline,
      bio: v.bio,
      location: v.location,
      linkedinUrl: v.linkedinUrl,
    };
    if (student) {
      for (const k of STUDENT_KEYS) body[k] = v[k];
      body.preferredRoles = v.preferredRoles.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      body.jobTitle = v.jobTitle;
    }
    save(body);
  }

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard
        title="Basic information"
        description={student ? "Shown at the top of your public profile and used for job matching." : "Shown to students on your listings."}
        footer={<SaveRow type="submit" status={status} error={error} />}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <TextField label="Full name" autoComplete="name" required {...bind("fullName")} />
          {student ? (
            <TextField label="Headline" placeholder="CSE student who loves graph problems" {...bind("headline")} />
          ) : (
            <TextField label="Job title" placeholder="Talent acquisition lead" {...bind("jobTitle")} />
          )}
          <TextField label="Location" placeholder="Chennai, India" {...bind("location")} />
          <TextField label="LinkedIn URL" placeholder="https://www.linkedin.com/in/you" inputMode="url" {...bind("linkedinUrl")} />
          {student && (
            <>
              <TextField label="College" {...bind("college")} />
              <TextField label="Degree" placeholder="B.Tech" {...bind("degree")} />
              <TextField label="Department" placeholder="Computer Science and Engineering" {...bind("department")} />
              <TextField label="Graduation year" inputMode="numeric" placeholder="2027" {...bind("graduationYear")} />
              <TextField label="GitHub username" placeholder="octocat" hint="Repositories appear on your profile once GitHub is connected." {...bind("githubUsername")} />
              <TextField label="Codeforces handle" placeholder="tourist" {...bind("codeforcesHandle")} />
              <TextField
                className="sm:col-span-2"
                label="Preferred roles"
                placeholder="Frontend developer, Data analyst"
                hint="Separate roles with commas. Used for job recommendations."
                {...bind("preferredRoles")}
              />
            </>
          )}
          <TextArea className="sm:col-span-2" label="About you" rows={4} placeholder="A few lines about what you build and want to learn." {...bind("bio")} />
        </div>
      </SectionCard>
    </form>
  );
}
