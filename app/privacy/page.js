import { ArrowLeft, ShieldCheck, Swords } from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/common/Reveal";

export const metadata = {
  title: "Privacy policy",
  description: "What SkillArena collects, why, who can see it, and how to have it deleted.",
};

const UPDATED = "20 November 2026";

function Section({ id, title, children, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <section id={id} className="scroll-mt-24 rounded-card border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
      </section>
    </Reveal>
  );
}

const SECTIONS = [
  ["collect", "What we collect"],
  ["use", "How we use it"],
  ["google", "Google sign-in"],
  ["sharing", "Who can see your information"],
  ["services", "Services we rely on"],
  ["cookies", "Cookies and local storage"],
  ["keep", "How long we keep it, and deleting it"],
  ["security", "Security"],
  ["contact", "Changes and contact"],
];

/** Public privacy policy (required by Google to publish the sign-in app). Static: no data is read here. */
export default function PrivacyPage() {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1.5 font-medium">
            <Swords size={18} className="text-arena-600" aria-hidden="true" /> SkillArena
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft size={14} aria-hidden="true" /> Back to the site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-24 pt-10">
        <Reveal>
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-arena-50 text-arena-600">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-3xl font-medium tracking-tight">Privacy policy</h1>
          <p className="mt-2 text-muted">
            SkillArena is a platform where students practise coding, take assessments, join contests and apply for opportunities, and where recruiters find candidates. This page explains what we collect, why, who can see it and how to have it deleted. Last updated {UPDATED}.
          </p>
          <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-1.5 text-xs">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-line bg-panel px-3 py-1 text-muted transition-all hover:-translate-y-0.5 hover:border-arena-300 hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
        </Reveal>

        <Section id="collect" title="What we collect">
          <ul>
            <li><strong>Account details:</strong> your name and email address, and a securely hashed password if you sign up with email. If you sign in with Google we receive your name, email address and profile photo.</li>
            <li><strong>Profile information you add:</strong> for example your college, degree, graduation year, skills, education, experience, projects, preferred roles, and links to GitHub, LinkedIn or Codeforces. Recruiters add their job title and company details.</li>
            <li><strong>Files you upload:</strong> your resume, profile photo, or a company logo.</li>
            <li><strong>Your activity on SkillArena:</strong> code you submit and its results, assessment answers and scores, contest participation, XP, badges and streaks, saved listings, applications and their status, messages from recruiters, reports you send, and notifications.</li>
            <li><strong>Technical data:</strong> the session cookie that keeps you signed in, and short-lived counters (by account or IP address) used to stop abuse such as repeated sign-in attempts.</li>
          </ul>
          <p>We don&apos;t use advertising or analytics trackers, and we don&apos;t sell personal information.</p>
        </Section>

        <Section id="use" title="How we use it" delay={0.03}>
          <ul>
            <li>To run your account and the features you use: running and scoring your code, timing and scoring assessments, ranking contests, awarding XP and badges, and showing your progress.</li>
            <li>To recommend opportunities that match your skills, preferred roles and graduation year, and to notify you about them.</li>
            <li>To let you apply for opportunities and let the recruiters you apply to review your application.</li>
            <li>To keep the platform safe: preventing abuse, reviewing reports, and enforcing these rules.</li>
          </ul>
        </Section>

        <Section id="google" title="Google sign-in" delay={0.03}>
          <p>
            If you choose <strong>Continue with Google</strong>, SkillArena requests only your basic profile: your name, email address and profile photo (the <code>openid</code>, <code>email</code> and <code>profile</code> scopes). We use them only to create and sign in to your SkillArena account and to show your name and photo in the app.
          </p>
          <p>
            We do not access your Gmail, Drive, contacts or any other Google data, we do not use Google user data for advertising, and we do not sell it or transfer it to others except as needed to provide SkillArena or as required by law. SkillArena&apos;s use of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-arena-600 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
        </Section>

        <Section id="sharing" title="Who can see your information" delay={0.03}>
          <ul>
            <li><strong>Your public profile</strong> is visible to others only if it&apos;s set to public. In Settings you choose which sections are shown (education, experience, projects, coding stats, assessment scores, GitHub, LinkedIn, resume, email). Your email is hidden unless you choose to show it.</li>
            <li><strong>Leaderboards</strong> show the name, level and XP of students with public profiles.</li>
            <li><strong>Recruiters you apply to</strong> see your application: your profile, coding and assessment results, cover letter and resume. Your email is shared with them only once they shortlist you or invite you to an interview.</li>
            <li><strong>Recruiters searching for students</strong> see only public profiles, and only the sections you allow.</li>
            <li><strong>Admins</strong> can see account and content information when needed to run and moderate the platform.</li>
          </ul>
        </Section>

        <Section id="services" title="Services we rely on" delay={0.03}>
          <ul>
            <li><strong>Vercel</strong> hosts the website, and <strong>MongoDB Atlas</strong> stores the database and uploaded files.</li>
            <li><strong>Google</strong> provides the optional sign-in.</li>
            <li><strong>Paiza.io</strong> (or <strong>Judge0</strong>, if configured) runs the code you submit, so your code and the test input are sent to it for execution.</li>
            <li><strong>GitHub and Codeforces:</strong> if you add a GitHub username or Codeforces handle, we fetch your public stats (repositories, languages, rating) from them and show them on your profile, following your visibility settings.</li>
            <li><strong>Remotive and Arbeitnow</strong> supply some job listings. Those listings link to the original site, and when you apply there, their own privacy policy applies.</li>
          </ul>
        </Section>

        <Section id="cookies" title="Cookies and local storage" delay={0.03}>
          <p>
            We use one essential cookie to keep you signed in. Your browser also keeps unsent code drafts for the coding workspace in its local storage, so you don&apos;t lose work if you close the page. There are no advertising or cross-site tracking cookies.
          </p>
        </Section>

        <Section id="keep" title="How long we keep it, and deleting it" delay={0.03}>
          <p>
            We keep your information while your account exists, so your progress, history and applications stay available. You can edit or remove most profile details, uploads and links yourself at any time, and make your profile private in Settings.
          </p>
          <p>
            To delete your account and its data, contact us (see below). We&apos;ll delete it within 30 days, except for information we must keep to resolve an open report or meet a legal obligation. Applications you sent stay visible to the recruiter until then.
          </p>
        </Section>

        <Section id="security" title="Security" delay={0.03}>
          <p>
            The site uses HTTPS everywhere. Passwords are stored only as secure hashes. Access to data is checked on the server for every request. Uploads are checked by their actual content, and requests are rate limited to stop abuse. No system is perfectly secure, but we work to protect your information and fix problems quickly.
          </p>
          <p>SkillArena is meant for college students and recruiters, and isn&apos;t directed at children under 13.</p>
        </Section>

        <Section id="contact" title="Changes and contact" delay={0.03}>
          <p>If we change this policy we&apos;ll update the date at the top, and tell signed-in users about significant changes.</p>
          <p>
            For questions, or to ask for a copy or deletion of your data,{" "}
            {contact ? (
              <>
                email <a href={`mailto:${contact}`} className="text-arena-600 hover:underline">{contact}</a>.
              </>
            ) : (
              <>contact the SkillArena team at the support address shown on Google&apos;s sign-in screen for SkillArena.</>
            )}
          </p>
        </Section>
      </main>
    </div>
  );
}
