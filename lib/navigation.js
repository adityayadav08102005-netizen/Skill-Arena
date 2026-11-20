/**
 * Floating-dock items per role (eight at most, so the dock fits one row on a
 * phone). Settings and the public profile also live in the user menu.
 * `icon` is a key into the icon map in components/app/AppDock.js.
 */
export function dockItemsFor(role) {
  const algoarena = { href: "/algoarena", label: "AlgoArena", icon: "code" };
  const contests = { href: "/contests", label: "Contests", icon: "swords" };
  const assessments = { href: "/assessments", label: "Assessments", icon: "clipboard" };
  const skillbridge = { href: "/skillbridge", label: "SkillBridge", icon: "briefcase" };
  const leaderboard = { href: "/leaderboard", label: "Leaderboard", icon: "trophy" };
  const profile = { href: "/profile", label: "Edit profile", icon: "user" };
  if (role === "student") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      algoarena,
      contests,
      assessments,
      skillbridge,
      leaderboard,
      { href: "/achievements", label: "Achievements", icon: "award" },
      profile,
    ];
  }
  const settings = { href: "/settings", label: "Settings", icon: "settings" };
  if (role === "recruiter") {
    return [
      { href: "/recruiter", label: "Overview", icon: "dashboard" },
      { href: "/recruiter/listings", label: "Listings", icon: "briefcase" },
      { href: "/recruiter/students", label: "Find students", icon: "users" },
      { href: "/recruiter/company", label: "Company", icon: "building" },
      { href: "/skillbridge", label: "SkillBridge", icon: "globe" },
      leaderboard,
      profile,
      settings,
    ];
  }
  if (role === "admin") {
    return [
      { href: "/admin", label: "Overview", icon: "shield" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/companies", label: "Companies", icon: "building" },
      { href: "/admin/problems", label: "Problems", icon: "code" },
      { href: "/admin/questions", label: "Question bank", icon: "help" },
      { href: "/admin/contests", label: "Contests", icon: "swords" },
      { href: "/admin/opportunities", label: "Listings", icon: "briefcase" },
      { href: "/admin/reports", label: "Reports", icon: "flag" },
    ];
  }
  return [{ href: "/", label: "Home", icon: "home" }, algoarena, contests, assessments, skillbridge, leaderboard, profile, settings];
}
