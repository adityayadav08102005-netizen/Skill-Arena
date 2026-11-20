"use client";

import { Award, Briefcase, Building2, ClipboardCheck, Code2, Eye, Flag, Globe, HelpCircle, Home, LayoutDashboard, Settings, ShieldCheck, Swords, Trophy, User, Users } from "lucide-react";
import FloatingDock from "@/components/common/FloatingDock";

const ICONS = {
  home: Home,
  dashboard: LayoutDashboard,
  code: Code2,
  swords: Swords,
  trophy: Trophy,
  briefcase: Briefcase,
  clipboard: ClipboardCheck,
  award: Award,
  user: User,
  users: Users,
  building: Building2,
  globe: Globe,
  eye: Eye,
  settings: Settings,
  shield: ShieldCheck,
  help: HelpCircle,
  flag: Flag,
};

/** Client wrapper so the server can pass plain dock items (icons by key). */
export default function AppDock({ items }) {
  return <FloatingDock items={items.map((item) => ({ ...item, icon: ICONS[item.icon] ?? Home }))} />;
}
