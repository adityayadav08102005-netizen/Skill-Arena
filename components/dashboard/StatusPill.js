import { cn } from "@/lib/utils/cn";

const APPLICATION = {
  applied: ["Applied", "bg-page text-muted"],
  under_review: ["Under review", "bg-info-50 text-info-800"],
  shortlisted: ["Shortlisted", "bg-bridge-50 text-bridge-800"],
  interview_scheduled: ["Interview", "bg-arena-50 text-arena-800"],
  selected: ["Selected", "bg-xp-50 text-xp-800"],
  rejected: ["Not selected", "bg-danger-50 text-danger-800"],
  withdrawn: ["Withdrawn", "bg-page text-muted"],
};

const SUBMISSION = {
  accepted: ["Accepted", "text-bridge-600"],
  wrong_answer: ["Wrong answer", "text-danger-600"],
  time_limit_exceeded: ["Time limit", "text-xp-700"],
  runtime_error: ["Runtime error", "text-danger-600"],
  compilation_error: ["Compile error", "text-danger-600"],
  internal_error: ["Runner error", "text-muted"],
  pending: ["Pending", "text-muted"],
  not_executed: ["Not executed", "text-xp-700"],
};

export const SUBMISSION_LABELS = Object.fromEntries(Object.entries(SUBMISSION).map(([k, [label]]) => [k, label]));

export function ApplicationStatus({ status }) {
  const [label, tone] = APPLICATION[status] ?? [status, "bg-page text-muted"];
  return <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px]", tone)}>{label}</span>;
}

export function SubmissionStatus({ status }) {
  const [label, tone] = SUBMISSION[status] ?? [status, "text-muted"];
  return <span className={cn("shrink-0 text-xs font-medium", tone)}>{label}</span>;
}

export const APPLICATION_STATUS_ORDER = ["applied", "under_review", "shortlisted", "interview_scheduled", "selected", "rejected"];
export const applicationLabel = (s) => APPLICATION[s]?.[0] ?? s;
