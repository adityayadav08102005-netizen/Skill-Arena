import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import QuestionBank from "@/components/admin/QuestionBank";
import { FilterBar } from "@/components/admin/shared";
import { ASSESSMENT_CATEGORIES } from "@/data/assessments";
import { requireRole } from "@/lib/auth/session";
import { listQuestionsAdmin, parseQuestionFilters } from "@/services/adminContent";

export const metadata = { title: "Question bank · Admin" };

async function Content({ searchParams }) {
  await requireRole(["admin"], { next: "/admin/questions" });
  const params = await searchParams;
  const filters = parseQuestionFilters(params);
  // A report link (?edit=<id>) should find its question even on another page of results.
  const data = await listQuestionsAdmin(params.edit && /^[a-f0-9]{24}$/.test(params.edit) ? { ...filters, q: "", page: 0, category: "", difficulty: "", status: "", id: params.edit } : filters);
  const pageHref = (page) => `/admin/questions?${new URLSearchParams(Object.entries({ ...filters, page: page ? String(page) : "" }).filter(([, v]) => v))}`;

  return (
    <div className="space-y-5">
      <AdminHeader icon={HelpCircle} title="Question bank" sub={`${data.total} question${data.total === 1 ? "" : "s"}. Tests draw at random from active questions; answered ones stay for students' reviews.`} />
      <FilterBar
        values={filters}
        placeholder="Search question or topic"
        fields={[
          { name: "category", label: "Category", options: [["", "All categories"], ...ASSESSMENT_CATEGORIES.map((c) => [c.key, c.label])] },
          { name: "difficulty", label: "Difficulty", options: [["", "Any difficulty"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]] },
          { name: "status", label: "Status", options: [["", "Active and inactive"], ["active", "Active"], ["inactive", "Inactive"]] },
        ]}
      />
      <QuestionBank items={data.items} coverage={data.coverage} category={filters.category} />
      {(data.hasMore || filters.page > 0) && (
        <div className="flex justify-center gap-2">
          {filters.page > 0 && <Link href={pageHref(filters.page - 1)} scroll={false} className="rounded-full border border-line bg-panel px-5 py-2 text-sm hover:border-arena-300">Previous</Link>}
          {data.hasMore && <Link href={pageHref(filters.page + 1)} scroll={false} className="rounded-full border border-line bg-panel px-5 py-2 text-sm hover:border-arena-300">Next page</Link>}
        </div>
      )}
    </div>
  );
}

export default function AdminQuestionsPage({ searchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-panel" aria-hidden="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
