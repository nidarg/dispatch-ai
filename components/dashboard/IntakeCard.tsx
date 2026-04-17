import type { IntakeRow } from "@/lib/dashboard/intakes";

type IntakeCardProps = {
  intake: IntakeRow;
};

function getPriorityClasses(priority: IntakeRow["priority"]) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "normal":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default function IntakeCard({ intake }: IntakeCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-zinc-900">
            {intake.company_slug}
          </span>

          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
            {intake.use_case}
          </span>

          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${getPriorityClasses(
              intake.priority
            )}`}
          >
            {intake.priority}
          </span>
        </div>

        <span className="text-xs text-zinc-400">
          {new Date(intake.created_at).toLocaleString()}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Original message
          </p>
          <p className="mt-1 text-sm text-zinc-800">
            {intake.original_message}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            AI summary
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {intake.summary}
          </p>
        </div>

        <div className="text-xs text-zinc-500">
          Language:{" "}
          <span className="font-medium text-zinc-700">
            {intake.detected_language}
          </span>
        </div>
      </div>
    </article>
  );
}