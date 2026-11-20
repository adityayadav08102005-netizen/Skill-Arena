import { Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import UsersTable from "@/components/admin/UsersTable";
import { FilterBar } from "@/components/admin/shared";
import { requireRole } from "@/lib/auth/session";
import { listUsers, parseUserFilters } from "@/services/admin";

export const metadata = { title: "Users · Admin" };

async function Content({ searchParams }) {
  const { user } = await requireRole(["admin"], { next: "/admin/users" });
  const filters = parseUserFilters(await searchParams);
  const data = await listUsers(filters);
  const pageHref = (page) => `/admin/users?${new URLSearchParams(Object.entries({ q: filters.q, role: filters.role, status: filters.status, page: page ? String(page) : "" }).filter(([, v]) => v))}`;

  return (
    <div className="space-y-5">
      <AdminHeader icon={Users} title="Users and roles" sub="Switch accounts between student and recruiter, or suspend them. Admins are added with npm run make-admin." />
      <FilterBar
        values={filters}
        placeholder="Search by name or email"
        fields={[
          { name: "role", label: "Role", options: [["", "All roles"], ["student", "Students"], ["recruiter", "Recruiters"], ["admin", "Admins"]] },
          { name: "status", label: "Status", options: [["", "Any status"], ["active", "Active"], ["suspended", "Suspended"]] },
        ]}
      />
      <p className="text-xs text-muted">{data.total} account{data.total === 1 ? "" : "s"}</p>
      <UsersTable items={data.items} selfId={user.id} />
      {(data.hasMore || filters.page > 0) && (
        <div className="flex justify-center gap-2">
          {filters.page > 0 && <Link href={pageHref(filters.page - 1)} scroll={false} className="rounded-full border border-line bg-panel px-5 py-2 text-sm hover:border-arena-300">Previous</Link>}
          {data.hasMore && <Link href={pageHref(filters.page + 1)} scroll={false} className="rounded-full border border-line bg-panel px-5 py-2 text-sm hover:border-arena-300">Next page</Link>}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
