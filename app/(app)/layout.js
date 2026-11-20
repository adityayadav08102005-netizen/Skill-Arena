import { Swords } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AppDock from "@/components/app/AppDock";
import NotificationBell from "@/components/app/NotificationBell";
import UserMenu from "@/components/app/UserMenu";
import { getCurrentUser } from "@/lib/auth/session";
import { dockItemsFor } from "@/lib/navigation";
import { unreadCount } from "@/services/notifications";

async function TopBarUser() {
  const current = await getCurrentUser();
  if (!current) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/login" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink">Log in</Link>
        <Link href="/register" className="rounded-full bg-ink px-4 py-1.5 font-medium text-white transition-transform hover:-translate-y-0.5">Get started</Link>
      </div>
    );
  }
  const unread = await unreadCount(current.user.id);
  return (
    <div className="flex items-center gap-2">
      <NotificationBell initialUnread={unread} />
      <UserMenu user={current.user} hasAvatar={Boolean(current.profile?.avatarFileId)} />
    </div>
  );
}

async function Dock() {
  const current = await getCurrentUser();
  if (!current?.profile?.onboardingComplete) return null;
  return <AppDock items={dockItemsFor(current.user.role)} />;
}

/** Shell for signed-in pages: top bar with the user menu, floating dock at the bottom. */
export default function AppLayout({ children }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1.5 font-medium">
            <Swords size={18} className="text-arena-600" aria-hidden="true" /> SkillArena
          </Link>
          <Suspense fallback={<span className="size-9 animate-pulse rounded-full bg-line" />}>
            <TopBarUser />
          </Suspense>
        </div>
      </header>
      {/* Pages containing a .wide-page element (the coding workspace) get extra width. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 has-[.wide-page]:max-w-[100rem]">{children}</main>
      <Suspense fallback={null}>
        <Dock />
      </Suspense>
    </>
  );
}
