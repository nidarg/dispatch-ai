"use client";

import { useState } from "react";
import type { IntakeRow } from "@/lib/dashboard/intakes";

type IntakeCardProps = {
  intake: IntakeRow;
};

type IntakeStatus = IntakeRow["status"];

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

function getStatusClasses(status: IntakeStatus) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-700";
    case "in_progress":
      return "bg-yellow-100 text-yellow-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function formatStatus(status: IntakeStatus) {
  switch (status) {
    case "new":
      return "New";
    case "in_progress":
      return "In progress";
    case "resolved":
      return "Resolved";
    default:
      return status;
  }
}

export default function IntakeCard({ intake }: IntakeCardProps) {
  const [status, setStatus] = useState<IntakeStatus>(intake.status);
  const [loadingStatus, setLoadingStatus] = useState<IntakeStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const updateStatus = async (nextStatus: IntakeStatus) => {
    if (nextStatus === status) return;

    setLoadingStatus(nextStatus);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/intakes/${intake.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update status.");
      }

      setStatus(nextStatus);
    } catch (error) {
      console.error("Failed to update intake status:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update status."
      );
    } finally {
      setLoadingStatus(null);
    }
  };

  const isResolved = status === "resolved";

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

          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(
              status
            )}`}
          >
            {formatStatus(status)}
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

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => updateStatus("new")}
            disabled={loadingStatus !== null || status === "new"}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "new" ? "Updating..." : "Mark new"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("in_progress")}
            disabled={loadingStatus !== null || status === "in_progress"}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "in_progress" ? "Updating..." : "Start"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("resolved")}
            disabled={loadingStatus !== null || isResolved}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "resolved" ? "Updating..." : "Resolve"}
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </article>
  );
}