import type { IntakeRow } from "@/lib/dashboard/intakes";
import IntakeCard from "./IntakeCard";

type IntakeListProps = {
  intakes: IntakeRow[];
  emptyMessage?: string;
  canManageStatus?: boolean;
};

export default function IntakeList({
  intakes,
  emptyMessage = "No intakes yet.",
  canManageStatus = true,
}: IntakeListProps) {
  if (intakes.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {intakes.map((intake) => (
        <IntakeCard
          key={intake.id}
          intake={intake}
          canManageStatus={canManageStatus}
        />
      ))}
    </div>
  );
}