import FloatingNav from "@/components/common/FloatingNav";
import Marquee from "@/components/common/Marquee";
import Bento from "@/components/landing/Bento";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import JoinSection from "@/components/landing/JoinSection";
import RecruiterSection from "@/components/landing/RecruiterSection";
import { getLandingData } from "@/services/landing";

const NAV_LINKS = [
  { href: "/algoarena", label: "AlgoArena" },
  { href: "/skillbridge", label: "SkillBridge" },
  { href: "/assessments", label: "Assessments" },
  { href: "/contests", label: "Contests" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "#recruiters", label: "Recruiters" },
  { href: "/login", label: "Log in" },
];

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <>
      <FloatingNav links={NAV_LINKS} cta={{ href: "/register", label: "Get started" }} />
      <main className="flex-1">
        <Hero data={data} />
        <Bento data={data} />

        {data.companyNames.length > 0 && (
          <div className="border-y border-line bg-panel py-5">
            <p className="mb-3 text-center text-xs text-muted">
              {data.mode === "demo" ? "Sample companies in the demo data" : "Companies hiring on SkillArena"}
            </p>
            <Marquee className="text-sm text-muted">
              {data.companyNames.map((name, i) => (
                <span key={`${i}-${name}`} className="whitespace-nowrap font-medium transition-colors duration-200 hover:text-ink">
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        )}

        <div className="pt-20">
          <HowItWorks />
        </div>
        <RecruiterSection />
        <JoinSection mode={data.mode} />
      </main>


    </>
  );
}
